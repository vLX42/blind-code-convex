import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

// Load all Convex modules for the in-memory test backend.
const modules = import.meta.glob("./**/*.ts");

const PLAYER_COUNT = 10;

// End-to-end simulation: a host runs a game, 10 people join and submit, the
// host ends the round and opens participant voting, everyone votes, and the
// host reveals + finishes. Mirrors the real product flow with no live backend.
describe("e2e: host + 10 participants full voting flow", () => {
  test("10 players join, submit, vote, and the standings are correct", async () => {
    const t = convexTest(schema, modules);

    // --- Host sets up and starts the game ---
    const hostId = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "host", username: "host" })
    );

    const gameId = await t.mutation(api.games.createGame, {
      creatorId: hostId,
      title: "Code in the Dark Night",
      description: "Recreate the landing page",
      referenceImageUrl: "http://example/ref.png",
      hexColors: [{ name: "BG", hex: "#0a0a12" }],
    });

    await t.mutation(api.games.openLobby, { gameId, creatorId: hostId });
    await t.mutation(api.games.startGame, { gameId, creatorId: hostId });

    // --- 10 people join as guests and each submit an entry ---
    const players: Id<"players">[] = [];
    const entries: Id<"entries">[] = [];
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const playerId = await t.mutation(api.players.joinGame, {
        gameId,
        handle: `Player${i}`,
      });
      players.push(playerId);
      const entry = await t.query(api.entries.getPlayerEntry, { playerId });
      entries.push(entry!._id);
      await t.mutation(api.entries.submitEntry, {
        entryId: entry!._id,
        html: `<h1>Player ${i}</h1><p>submission ${i}</p>`,
        totalScore: i * 5, // increasing typing scores -> deterministic tie-breaks
        maxStreak: i,
        totalKeystrokes: i * 10,
      });
    }
    expect(players).toHaveLength(PLAYER_COUNT);

    // --- Host ends the round and opens participant voting ---
    await t.mutation(api.games.endGame, { gameId, creatorId: hostId });
    await t.mutation(api.games.setVotingMode, {
      gameId,
      creatorId: hostId,
      mode: "participant",
    });
    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "voting",
    });

    // Everyone is allowed exactly 2 votes (plenty of rivals).
    for (const playerId of players) {
      const mine = await t.query(api.participantVotes.getMyParticipantVotes, {
        gameId,
        voterPlayerId: playerId,
      });
      expect(mine.votesAllowed).toBe(2);
    }

    // --- Everyone votes (deterministic pattern, never for themselves) ---
    // Almost everyone makes entry0 their 1st choice; entry1 collects 2nd-place
    // votes; entry2 gets a couple. Player0 can't pick its own entry, so it
    // votes for entry1 / entry2 instead.
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const firstChoice = i === 0 ? entries[1]! : entries[0]!;
      let secondChoice: Id<"entries">;
      if (i === 0 || i === 1) {
        secondChoice = entries[2]!;
      } else {
        secondChoice = entries[1]!;
      }
      await t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[i]!,
        entryId: firstChoice,
        rank: 1,
      });
      await t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[i]!,
        entryId: secondChoice,
        rank: 2,
      });
    }

    // --- Host sees everyone has voted ---
    const status = await t.query(
      api.participantVotes.getParticipantVoteStatus,
      { gameId }
    );
    expect(status.eligibleCount).toBe(PLAYER_COUNT);
    expect(status.votedCount).toBe(PLAYER_COUNT);
    expect(status.totalVotesCast).toBe(PLAYER_COUNT * 2);

    // --- Standings are correct ---
    // entry0: 1st from players 1..9 (9 * 2)                 = 18 pts, 9 firsts
    // entry1: 1st from player0 (2) + 2nd from players 2..9 (8) = 10 pts, 1 first
    // entry2: 2nd from player0 and player1 (2)              =  2 pts, 0 firsts
    // entries 3..9: 0 pts
    const results = await t.query(
      api.participantVotes.getParticipantResults,
      { gameId }
    );

    expect(results[0]).toMatchObject({
      entry: expect.objectContaining({ _id: entries[0] }),
      points: 18,
      firstPlaceVotes: 9,
    });
    expect(results[1]).toMatchObject({
      entry: expect.objectContaining({ _id: entries[1] }),
      points: 10,
      firstPlaceVotes: 1,
      secondPlaceVotes: 8,
    });
    expect(results[2]).toMatchObject({
      entry: expect.objectContaining({ _id: entries[2] }),
      points: 2,
      secondPlaceVotes: 2,
    });

    // The remaining entries scored nothing; total points conserved
    // (10 firsts * 2 + 10 seconds * 1 = 30).
    const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
    expect(totalPoints).toBe(PLAYER_COUNT * 2 + PLAYER_COUNT * 1);

    // The winner is Player0.
    expect(results[0]!.player?.handle).toBe("Player0");

    // --- Host reveals and finishes ---
    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "reveal",
    });
    await t.mutation(api.games.finishGame, { gameId, creatorId: hostId });

    const game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game).toMatchObject({
      status: "finished",
      votingMode: "participant",
      votingPhase: "reveal",
    });
  });

  test("the synced reveal step advances and is creator-only", async () => {
    const t = convexTest(schema, modules);
    const hostId = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "rhost", username: "rhost" })
    );
    const gameId = await t.mutation(api.games.createGame, {
      creatorId: hostId,
      title: "g",
      description: "d",
      referenceImageUrl: "http://x",
      hexColors: [],
    });
    await t.mutation(api.games.openLobby, { gameId, creatorId: hostId });
    await t.mutation(api.games.startGame, { gameId, creatorId: hostId });
    for (let i = 0; i < 3; i++) {
      const playerId = await t.mutation(api.players.joinGame, {
        gameId,
        handle: `P${i}`,
      });
      const entry = await t.query(api.entries.getPlayerEntry, { playerId });
      await t.mutation(api.entries.submitEntry, {
        entryId: entry!._id,
        html: "<p>x</p>",
        totalScore: i,
        maxStreak: 0,
        totalKeystrokes: 0,
      });
    }
    await t.mutation(api.games.endGame, { gameId, creatorId: hostId });

    // Entering the reveal phase resets the synced step to 0.
    await t.mutation(api.games.setVotingMode, {
      gameId,
      creatorId: hostId,
      mode: "participant",
    });
    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "reveal",
    });
    let game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.revealStep).toBe(0);

    // Host advances the podium reveal 1 -> 2 -> 3.
    for (const step of [1, 2, 3]) {
      await t.mutation(api.games.setRevealStep, {
        gameId,
        creatorId: hostId,
        step,
      });
      game = await t.run(async (ctx) => ctx.db.get(gameId));
      expect(game?.revealStep).toBe(step);
    }

    // A non-host can't drive the reveal.
    const stranger = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "stranger-r", username: "s" })
    );
    await expect(
      t.mutation(api.games.setRevealStep, {
        gameId,
        creatorId: stranger,
        step: 99,
      })
    ).rejects.toThrow(/Only the creator/);

    // Re-opening voting clears the reveal progress.
    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "voting",
    });
    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.revealStep).toBeUndefined();
  });

  test("no one's vote is ever counted for their own entry", async () => {
    const t = convexTest(schema, modules);
    const hostId = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "host2", username: "host2" })
    );
    const gameId = await t.mutation(api.games.createGame, {
      creatorId: hostId,
      title: "g",
      description: "d",
      referenceImageUrl: "http://x",
      hexColors: [],
    });
    await t.mutation(api.games.openLobby, { gameId, creatorId: hostId });
    await t.mutation(api.games.startGame, { gameId, creatorId: hostId });

    const players: Id<"players">[] = [];
    const entries: Id<"entries">[] = [];
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const playerId = await t.mutation(api.players.joinGame, {
        gameId,
        handle: `P${i}`,
      });
      players.push(playerId);
      const entry = await t.query(api.entries.getPlayerEntry, { playerId });
      entries.push(entry!._id);
      await t.mutation(api.entries.submitEntry, {
        entryId: entry!._id,
        html: `<p>${i}</p>`,
        totalScore: 0,
        maxStreak: 0,
        totalKeystrokes: 0,
      });
    }

    await t.mutation(api.games.endGame, { gameId, creatorId: hostId });
    await t.mutation(api.games.setVotingMode, {
      gameId,
      creatorId: hostId,
      mode: "participant",
    });
    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "voting",
    });

    // Every player tries to vote for their OWN entry first — all should fail —
    // then votes for a neighbour, which succeeds.
    for (let i = 0; i < PLAYER_COUNT; i++) {
      await expect(
        t.mutation(api.participantVotes.setVote, {
          gameId,
          voterPlayerId: players[i]!,
          entryId: entries[i]!,
          rank: 1,
        })
      ).rejects.toThrow(/own submission/);

      await t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[i]!,
        entryId: entries[(i + 1) % PLAYER_COUNT]!,
        rank: 1,
      });
    }

    // No participant vote points at the voter's own entry.
    const selfVotes = await t.run(async (ctx) => {
      const votes = await ctx.db
        .query("participantVotes")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      const players2 = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      const entriesByPlayer = new Map<string, string>();
      for (const e of await ctx.db
        .query("entries")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect()) {
        entriesByPlayer.set(e.playerId as string, e._id as string);
      }
      void players2;
      return votes.filter(
        (v) => entriesByPlayer.get(v.voterPlayerId as string) === (v.entryId as string)
      );
    });
    expect(selfVotes).toHaveLength(0);
  });
});
