import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

// Load all Convex modules for the in-memory test backend.
const modules = import.meta.glob("./**/*.ts");

// Spin up a game, run it to the voting stage in participant mode, and return
// the ids a test needs. `numPlayers` submitted entries are created.
async function setupVotingGame(numPlayers: number) {
  const t = convexTest(schema, modules);

  const creatorId = await t.run(async (ctx) =>
    ctx.db.insert("users", { githubId: "host-gh", username: "host" })
  );

  const gameId = await t.mutation(api.games.createGame, {
    creatorId,
    title: "Test Game",
    description: "desc",
    referenceImageUrl: "http://example/ref.png",
    hexColors: [],
  });

  await t.mutation(api.games.openLobby, { gameId, creatorId });
  await t.mutation(api.games.startGame, { gameId, creatorId });

  const players: Id<"players">[] = [];
  const entries: Id<"entries">[] = [];
  for (let i = 1; i <= numPlayers; i++) {
    const playerId = await t.mutation(api.players.joinGame, {
      gameId,
      handle: `Player${i}`,
    });
    players.push(playerId);
    const entry = await t.query(api.entries.getPlayerEntry, { playerId });
    entries.push(entry!._id);
    await t.mutation(api.entries.submitEntry, {
      entryId: entry!._id,
      html: `<h1>Player ${i}</h1>`,
      totalScore: i * 10,
      maxStreak: i,
      totalKeystrokes: i * 5,
    });
  }

  await t.mutation(api.games.endGame, { gameId, creatorId });
  await t.mutation(api.games.setVotingMode, {
    gameId,
    creatorId,
    mode: "participant",
  });
  await t.mutation(api.games.setVotingPhase, {
    gameId,
    creatorId,
    phase: "voting",
  });

  return { t, creatorId, gameId, players, entries };
}

describe("participant voting — full flow", () => {
  test("happy path: ranked votes produce the correct ranking", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(3);
    const [p1, p2, p3] = players;
    const [e1, e2, e3] = entries;

    // p1: 1st -> e2, 2nd -> e3
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1!,
      entryId: e2!,
      rank: 1,
    });
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1!,
      entryId: e3!,
      rank: 2,
    });
    // p2: 1st -> e1, 2nd -> e3
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p2!,
      entryId: e1!,
      rank: 1,
    });
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p2!,
      entryId: e3!,
      rank: 2,
    });
    // p3: 1st -> e2
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p3!,
      entryId: e2!,
      rank: 1,
    });

    const results = await t.query(api.participantVotes.getParticipantResults, {
      gameId,
    });

    // e2: two 1st-place => 4 pts; e1: one 1st => 2 pts; e3: two 2nd => 2 pts.
    // Tie between e1 and e3 broken by 1st-place count (e1 wins).
    expect(results.map((r) => r.entry._id)).toEqual([e2, e1, e3]);
    expect(results[0]).toMatchObject({ points: 4, firstPlaceVotes: 2 });
    expect(results[1]).toMatchObject({ points: 2, firstPlaceVotes: 1 });
    expect(results[2]).toMatchObject({
      points: 2,
      firstPlaceVotes: 0,
      secondPlaceVotes: 2,
    });

    // Live status: all 3 eligible players have voted.
    const status = await t.query(
      api.participantVotes.getParticipantVoteStatus,
      { gameId }
    );
    expect(status).toMatchObject({ eligibleCount: 3, votedCount: 3 });
  });

  test("a voter cannot vote for their own submission", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(3);
    await expect(
      t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[0]!,
        entryId: entries[0]!, // own entry
        rank: 1,
      })
    ).rejects.toThrow(/own submission/);
  });

  test("rank must be 1 or 2", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(3);
    await expect(
      t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[0]!,
        entryId: entries[1]!,
        rank: 3,
      })
    ).rejects.toThrow(/Rank must be/);
  });

  test("the two ranks must be distinct entries (reusing an entry moves it)", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(3);
    const p1 = players[0]!;

    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1,
      entryId: entries[1]!,
      rank: 1,
    });
    // Assigning rank 2 to the same entry should clear rank 1.
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1,
      entryId: entries[1]!,
      rank: 2,
    });

    const mine = await t.query(api.participantVotes.getMyParticipantVotes, {
      gameId,
      voterPlayerId: p1,
    });
    expect(mine.votes).toHaveLength(1);
    expect(mine.votes[0]).toMatchObject({ entryId: entries[1], rank: 2 });
  });

  test("clearVote lets a voter use fewer votes", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(3);
    const p1 = players[0]!;

    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1,
      entryId: entries[1]!,
      rank: 1,
    });
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1,
      entryId: entries[2]!,
      rank: 2,
    });
    await t.mutation(api.participantVotes.clearVote, {
      gameId,
      voterPlayerId: p1,
      rank: 2,
    });

    const mine = await t.query(api.participantVotes.getMyParticipantVotes, {
      gameId,
      voterPlayerId: p1,
    });
    expect(mine.votes).toHaveLength(1);
    expect(mine.votes[0]).toMatchObject({ rank: 1 });
  });

  test("vote cap adapts: only 1 vote allowed with a single rival", async () => {
    const { t, gameId, players, entries } = await setupVotingGame(2);
    const p1 = players[0]!;

    const mine = await t.query(api.participantVotes.getMyParticipantVotes, {
      gameId,
      voterPlayerId: p1,
    });
    expect(mine.votesAllowed).toBe(1);

    // rank 1 succeeds...
    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: p1,
      entryId: entries[1]!,
      rank: 1,
    });
    // ...but rank 2 is rejected (not enough submissions).
    await expect(
      t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: p1,
        entryId: entries[1]!,
        rank: 2,
      })
    ).rejects.toThrow(/Not enough submissions/);
  });

  test("host can joinAsVoter (no submission) and still cast 2 votes", async () => {
    const { t, creatorId, gameId, entries } = await setupVotingGame(3);

    const hostPlayerId = await t.mutation(api.players.joinAsVoter, {
      gameId,
      userId: creatorId,
      handle: "host",
    });

    const mine = await t.query(api.participantVotes.getMyParticipantVotes, {
      gameId,
      voterPlayerId: hostPlayerId,
    });
    expect(mine.votesAllowed).toBe(2); // host has no own entry

    await t.mutation(api.participantVotes.setVote, {
      gameId,
      voterPlayerId: hostPlayerId,
      entryId: entries[0]!,
      rank: 1,
    });
    const after = await t.query(api.participantVotes.getMyParticipantVotes, {
      gameId,
      voterPlayerId: hostPlayerId,
    });
    expect(after.votes).toHaveLength(1);

    // Host votes don't inflate the eligible-participant ratio.
    const status = await t.query(
      api.participantVotes.getParticipantVoteStatus,
      { gameId }
    );
    expect(status.eligibleCount).toBe(3);
    expect(status.votedCount).toBe(0); // no eligible player voted yet
  });

  test("voting is blocked outside the voting phase", async () => {
    const { t, creatorId, gameId, players, entries } = await setupVotingGame(3);

    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId,
      phase: "reveal",
    });

    await expect(
      t.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: players[0]!,
        entryId: entries[1]!,
        rank: 1,
      })
    ).rejects.toThrow(/not currently open/);
  });

  test("host can advance to reveal and finish the game", async () => {
    const { t, creatorId, gameId } = await setupVotingGame(3);

    await t.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId,
      phase: "reveal",
    });
    await t.mutation(api.games.finishGame, { gameId, creatorId });

    const game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game).toMatchObject({
      status: "finished",
      votingMode: "participant",
      votingPhase: "reveal",
    });
  });

  test("only the creator can change voting mode/phase", async () => {
    const { t, gameId } = await setupVotingGame(3);
    const stranger = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "stranger", username: "x" })
    );
    await expect(
      t.mutation(api.games.setVotingMode, {
        gameId,
        creatorId: stranger,
        mode: "classic",
      })
    ).rejects.toThrow(/Only the creator/);
  });
});
