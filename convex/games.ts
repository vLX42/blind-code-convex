import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a short code for URLs
function generateShortCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new game
export const createGame = mutation({
  args: {
    creatorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    referenceImageUrl: v.string(),
    hexColors: v.array(v.object({
      name: v.string(),
      hex: v.string(),
    })),
    requirements: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shortCode = generateShortCode();

    return await ctx.db.insert("games", {
      creatorId: args.creatorId,
      title: args.title,
      description: args.description,
      shortCode,
      referenceImageUrl: args.referenceImageUrl,
      hexColors: args.hexColors,
      requirements: args.requirements,
      durationMinutes: args.durationMinutes ?? 15,
      status: "draft",
    });
  },
});

// Get game by short code (for joining)
export const getGameByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_short_code", (q) => q.eq("shortCode", args.shortCode))
      .first();
  },
});

// Get game by ID with creator info
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const creator = await ctx.db.get(game.creatorId);
    return { ...game, creator };
  },
});

// Get games created by a user
export const getMyGames = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .collect();
  },
});

// Update game to lobby status (ready for players to join)
export const openLobby = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can open the lobby");
    }
    await ctx.db.patch(args.gameId, { status: "lobby" });
  },
});

// Start the game
export const startGame = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can start the game");
    }
    await ctx.db.patch(args.gameId, {
      status: "active",
      startedAt: Date.now(),
    });
  },
});

// End the game and move to voting
export const endGame = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can end the game");
    }

    // Auto-submit all entries for this game
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    for (const entry of entries) {
      if (!entry.isSubmitted) {
        await ctx.db.patch(entry._id, {
          isSubmitted: true,
          submittedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.gameId, {
      status: "voting",
      endedAt: Date.now(),
    });
  },
});

// Finish voting and mark game as finished
export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can finish the game");
    }
    await ctx.db.patch(args.gameId, { status: "finished" });
  },
});

// Update game details
export const updateGame = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    referenceImageUrl: v.optional(v.string()),
    hexColors: v.optional(v.array(v.object({
      name: v.string(),
      hex: v.string(),
    }))),
    requirements: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can update this game");
    }
    const { gameId, creatorId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(gameId, filteredUpdates);
  },
});

// Get active games (for display)
export const getActiveGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// Delete a game and all associated data
export const deleteGame = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the creator owns this game
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the creator can delete this game");
    }

    // Collect all asset URLs for UploadThing deletion (returned to caller)
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    const assetUrls = assets.map((a) => a.url);

    // Also collect reference image URL
    if (game.referenceImageUrl) {
      assetUrls.push(game.referenceImageUrl);
    }

    // Delete assets
    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }

    // Delete all entries and their progress snapshots
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    for (const entry of entries) {
      // Delete progress snapshots
      const snapshots = await ctx.db
        .query("progressSnapshots")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id);
      }
      await ctx.db.delete(entry._id);
    }

    // Delete all votes
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete all players
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    // Delete the game
    await ctx.db.delete(args.gameId);

    // Return asset URLs for external cleanup
    return { deletedAssetUrls: assetUrls };
  },
});
