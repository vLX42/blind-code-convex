import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Join a game as a player
export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    userId: v.optional(v.id("users")),
    handle: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already joined this game
    if (args.userId) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_user_and_game", (q) =>
          q.eq("userId", args.userId).eq("gameId", args.gameId)
        )
        .first();

      if (existing) {
        // Reactivate if inactive
        if (!existing.isActive) {
          await ctx.db.patch(existing._id, { isActive: true });
        }
        return existing._id;
      }
    }

    // Create new player
    const playerId = await ctx.db.insert("players", {
      gameId: args.gameId,
      userId: args.userId,
      handle: args.handle,
      joinedAt: Date.now(),
      isActive: true,
    });

    // Create empty entry for the player
    await ctx.db.insert("entries", {
      gameId: args.gameId,
      playerId,
      html: "",
      isSubmitted: false,
      totalScore: 0,
      maxStreak: 0,
      totalKeystrokes: 0,
    });

    return playerId;
  },
});

// Get all players in a game
export const getGamePlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get user info for each player
    const playersWithUsers = await Promise.all(
      players.map(async (player) => {
        const user = player.userId ? await ctx.db.get(player.userId) : null;
        return { ...player, user };
      })
    );

    return playersWithUsers;
  },
});

// Get player by user and game
export const getPlayerByUserAndGame = query({
  args: {
    userId: v.id("users"),
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_user_and_game", (q) =>
        q.eq("userId", args.userId).eq("gameId", args.gameId)
      )
      .first();
  },
});

// Leave a game (mark as inactive)
export const leaveGame = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { isActive: false });
  },
});

// Get active player count for a game
export const getActivePlayerCount = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return players.length;
  },
});

// Get player by ID
export const getPlayerById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});
