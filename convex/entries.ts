import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get entry for a player
export const getPlayerEntry = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entries")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();
  },
});

// Get all entries for a game (for viewing/voting)
export const getGameEntries = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get player info for each entry
    const entriesWithPlayers = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        return { ...entry, player };
      })
    );

    return entriesWithPlayers;
  },
});

// Update entry HTML and stats (called periodically while coding)
export const updateEntry = mutation({
  args: {
    entryId: v.id("entries"),
    html: v.string(),
    streak: v.number(),
    keystrokeCount: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    // Update max streak if current is higher
    const maxStreak = Math.max(entry.maxStreak, args.streak);

    await ctx.db.patch(args.entryId, {
      html: args.html,
      maxStreak,
      totalKeystrokes: args.keystrokeCount,
    });
  },
});

// Save progress snapshot for playback
export const saveProgressSnapshot = mutation({
  args: {
    entryId: v.id("entries"),
    html: v.string(),
    streak: v.number(),
    powerMode: v.boolean(),
    keystrokeCount: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("progressSnapshots", {
      entryId: args.entryId,
      html: args.html,
      streak: args.streak,
      powerMode: args.powerMode,
      keystrokeCount: args.keystrokeCount,
      timestamp: args.timestamp,
    });
  },
});

// Get progress snapshots for playback
export const getProgressSnapshots = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressSnapshots")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
  },
});

// Submit entry (mark as final)
export const submitEntry = mutation({
  args: {
    entryId: v.id("entries"),
    html: v.string(),
    totalScore: v.number(),
    maxStreak: v.number(),
    totalKeystrokes: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      html: args.html,
      isSubmitted: true,
      submittedAt: Date.now(),
      totalScore: args.totalScore,
      maxStreak: args.maxStreak,
      totalKeystrokes: args.totalKeystrokes,
    });
  },
});

// Calculate score based on typing performance
// Points: base keystroke points + streak bonuses + power mode bonuses
export const calculateScore = query({
  args: {
    keystrokeCount: v.number(),
    maxStreak: v.number(),
    powerModeTime: v.number(), // seconds spent in power mode
  },
  handler: async (_, args) => {
    const keystrokePoints = args.keystrokeCount;
    const streakBonus = Math.floor(args.maxStreak * 1.5);
    const powerModeBonus = args.powerModeTime * 2;

    return keystrokePoints + streakBonus + powerModeBonus;
  },
});

// Get submitted entries for a game (sorted by score)
export const getSubmittedEntries = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isSubmitted"), true))
      .collect();

    // Get player info and sort by score
    const entriesWithPlayers = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        return { ...entry, player };
      })
    );

    return entriesWithPlayers.sort((a, b) => b.totalScore - a.totalScore);
  },
});
