import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a short code for asset URLs
function generateAssetCode(length = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Add an asset to a game
export const addAsset = mutation({
  args: {
    gameId: v.id("games"),
    name: v.string(),
    url: v.string(),
    type: v.union(v.literal("image"), v.literal("font"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const shortCode = generateAssetCode();

    return await ctx.db.insert("assets", {
      gameId: args.gameId,
      shortCode,
      name: args.name,
      url: args.url,
      type: args.type,
    });
  },
});

// Get all assets for a game
export const getGameAssets = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Get asset by short code
export const getAssetByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_short_code", (q) => q.eq("shortCode", args.shortCode))
      .first();
  },
});

// Remove an asset
export const removeAsset = mutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.assetId);
  },
});

// Update asset details
export const updateAsset = mutation({
  args: {
    assetId: v.id("assets"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { assetId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(assetId, filteredUpdates);
  },
});
