import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// Create a host + a draft game and return their ids.
async function makeGame(t: ReturnType<typeof convexTest>, durationMinutes = 15) {
  const creatorId = await t.run(async (ctx) =>
    ctx.db.insert("users", { githubId: `host-${durationMinutes}`, username: "host" })
  );
  const gameId = await t.mutation(api.games.createGame, {
    creatorId,
    title: "G",
    description: "d",
    referenceImageUrl: "http://x/ref.png",
    hexColors: [],
    durationMinutes,
  });
  return { creatorId, gameId };
}

describe("game lifecycle", () => {
  test("runs draft -> lobby -> active -> voting -> finished", async () => {
    const t = convexTest(schema, modules);
    const { creatorId, gameId } = await makeGame(t);

    let game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("draft");

    await t.mutation(api.games.openLobby, { gameId, creatorId });
    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("lobby");

    await t.mutation(api.games.startGame, { gameId, creatorId });
    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("active");
    expect(typeof game?.startedAt).toBe("number");

    // A player joins (creates an unsubmitted entry).
    const playerId = await t.mutation(api.players.joinGame, {
      gameId,
      handle: "Player1",
    });
    const entry = await t.query(api.entries.getPlayerEntry, { playerId });
    expect(entry?.isSubmitted).toBe(false);

    // Ending the game moves to voting and auto-submits all entries.
    await t.mutation(api.games.endGame, { gameId, creatorId });
    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("voting");
    expect(typeof game?.endedAt).toBe("number");
    const submitted = await t.query(api.entries.getPlayerEntry, { playerId });
    expect(submitted?.isSubmitted).toBe(true);

    await t.mutation(api.games.finishGame, { gameId, creatorId });
    game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("finished");
  });

  test("only the creator can drive the lifecycle", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await makeGame(t);
    const stranger = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "stranger", username: "x" })
    );
    await expect(
      t.mutation(api.games.openLobby, { gameId, creatorId: stranger })
    ).rejects.toThrow(/Only the creator/);
    await expect(
      t.mutation(api.games.startGame, { gameId, creatorId: stranger })
    ).rejects.toThrow(/Only the creator/);
    await expect(
      t.mutation(api.games.endGame, { gameId, creatorId: stranger })
    ).rejects.toThrow(/Only the creator/);
    await expect(
      t.mutation(api.games.finishGame, { gameId, creatorId: stranger })
    ).rejects.toThrow(/Only the creator/);
  });
});

describe("joining", () => {
  test("each guest join creates a distinct player and entry", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await makeGame(t);

    const p1 = await t.mutation(api.players.joinGame, { gameId, handle: "Guest A" });
    const p2 = await t.mutation(api.players.joinGame, { gameId, handle: "Guest B" });
    expect(p1).not.toBe(p2);

    const players = await t.query(api.players.getGamePlayers, { gameId });
    expect(players).toHaveLength(2);

    // Each guest got their own entry.
    const e1 = await t.query(api.entries.getPlayerEntry, { playerId: p1 });
    const e2 = await t.query(api.entries.getPlayerEntry, { playerId: p2 });
    expect(e1?._id).not.toBe(e2?._id);
  });

  test("a logged-in user joining twice reuses their player", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await makeGame(t);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { githubId: "u1", username: "u1" })
    );

    const first = await t.mutation(api.players.joinGame, {
      gameId,
      userId,
      handle: "Me",
    });
    const second = await t.mutation(api.players.joinGame, {
      gameId,
      userId,
      handle: "Me again",
    });
    expect(first).toBe(second);
    const players = await t.query(api.players.getGamePlayers, { gameId });
    expect(players).toHaveLength(1);
  });
});

describe("live player state (host overview)", () => {
  test("records score/streak/power mode and only raises maxStreak", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await makeGame(t);
    const playerId = await t.mutation(api.players.joinGame, { gameId, handle: "P" });
    const entry = await t.query(api.entries.getPlayerEntry, { playerId });
    const entryId = entry!._id;

    await t.mutation(api.entries.updatePlayerState, {
      entryId,
      liveScore: 500,
      currentStreak: 120,
      powerMode: true,
    });
    let e = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(e).toMatchObject({ liveScore: 500, currentStreak: 120, powerMode: true });
    expect(e?.maxStreak).toBe(120);

    // A later, lower streak updates the live values but does not lower maxStreak.
    await t.mutation(api.entries.updatePlayerState, {
      entryId,
      liveScore: 520,
      currentStreak: 5,
      powerMode: false,
    });
    e = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(e).toMatchObject({ liveScore: 520, currentStreak: 5, powerMode: false });
    expect(e?.maxStreak).toBe(120); // unchanged
  });

  test("updatePlayerState is a no-op once the entry is submitted", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await makeGame(t);
    const playerId = await t.mutation(api.players.joinGame, { gameId, handle: "P" });
    const entry = await t.query(api.entries.getPlayerEntry, { playerId });
    const entryId = entry!._id;

    await t.mutation(api.entries.submitEntry, {
      entryId,
      html: "<p>done</p>",
      totalScore: 999,
      maxStreak: 10,
      totalKeystrokes: 50,
    });
    await t.mutation(api.entries.updatePlayerState, {
      entryId,
      liveScore: 1,
      currentStreak: 1,
      powerMode: true,
    });
    const e = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(e?.isSubmitted).toBe(true);
    expect(e?.liveScore).toBeUndefined(); // never written after submit
    expect(e?.totalScore).toBe(999);
  });
});

describe("auto-end when time is up", () => {
  test("does nothing before the timer expires", async () => {
    const t = convexTest(schema, modules);
    const { creatorId, gameId } = await makeGame(t);
    await t.mutation(api.games.openLobby, { gameId, creatorId });
    await t.mutation(api.games.startGame, { gameId, creatorId });

    const result = await t.mutation(api.games.autoEndGameIfTimeUp, { gameId });
    expect(result.transitioned).toBe(false);
    const game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("active");
  });

  test("ends and submits entries once the timer has expired", async () => {
    const t = convexTest(schema, modules);
    const { creatorId, gameId } = await makeGame(t, 15);
    await t.mutation(api.games.openLobby, { gameId, creatorId });
    await t.mutation(api.games.startGame, { gameId, creatorId });

    const playerId = await t.mutation(api.players.joinGame, { gameId, handle: "P" });
    const entry = await t.query(api.entries.getPlayerEntry, { playerId });

    // Pretend the game started more than 15 minutes ago.
    await t.run(async (ctx) => {
      const g = (await ctx.db.get(gameId))!;
      await ctx.db.patch(gameId, {
        startedAt: g.startedAt! - (16 * 60 * 1000),
      });
    });

    const result = await t.mutation(api.games.autoEndGameIfTimeUp, { gameId });
    expect(result.transitioned).toBe(true);
    const game = await t.run(async (ctx) => ctx.db.get(gameId));
    expect(game?.status).toBe("voting");
    const e = await t.run(async (ctx) => ctx.db.get(entry!._id));
    expect(e?.isSubmitted).toBe(true);
  });
});
