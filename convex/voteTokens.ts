import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random token
function generateToken(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new vote token (only game creator can do this)
export const createVoteToken = mutation({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the creator owns this game
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.creatorId !== args.creatorId) {
      throw new Error("Only the game creator can create vote tokens");
    }

    const token = generateToken();

    return await ctx.db.insert("voteTokens", {
      gameId: args.gameId,
      token,
      label: args.label,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Get all vote tokens for a game (only for creator)
export const getGameVoteTokens = query({
  args: {
    gameId: v.id("games"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the creator owns this game
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return [];
    }
    if (game.creatorId !== args.creatorId) {
      return [];
    }

    return await ctx.db
      .query("voteTokens")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Validate a vote token and claim it for a user
export const claimVoteToken = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const voteToken = await ctx.db
      .query("voteTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!voteToken) {
      throw new Error("Invalid vote token");
    }

    if (!voteToken.isActive) {
      throw new Error("This vote token is no longer active");
    }

    // If already claimed by someone else, reject
    if (voteToken.usedBy && voteToken.usedBy !== args.userId) {
      throw new Error("This vote token has already been claimed by another user");
    }

    // Claim the token for this user if not already claimed
    if (!voteToken.usedBy) {
      await ctx.db.patch(voteToken._id, { usedBy: args.userId });
    }

    return {
      gameId: voteToken.gameId,
      label: voteToken.label,
    };
  },
});

// Verify if a user can vote on a game (creator or has valid token)
export const canUserVote = query({
  args: {
    gameId: v.id("games"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return { canVote: false, reason: "Game not found" };
    }

    // Creator can always vote
    if (game.creatorId === args.userId) {
      return { canVote: true, reason: "creator" };
    }

    // Check if user has a valid vote token
    const tokens = await ctx.db
      .query("voteTokens")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) =>
        q.and(
          q.eq(q.field("usedBy"), args.userId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (tokens) {
      return { canVote: true, reason: "token" };
    }

    return { canVote: false, reason: "No permission to vote" };
  },
});

// Deactivate a vote token (creator only)
export const deactivateVoteToken = mutation({
  args: {
    tokenId: v.id("voteTokens"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db.get(args.tokenId);
    if (!token) {
      throw new Error("Token not found");
    }

    const game = await ctx.db.get(token.gameId);
    if (!game || game.creatorId !== args.creatorId) {
      throw new Error("Only the game creator can deactivate tokens");
    }

    await ctx.db.patch(args.tokenId, { isActive: false });
  },
});

// Delete a vote token (creator only)
export const deleteVoteToken = mutation({
  args: {
    tokenId: v.id("voteTokens"),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db.get(args.tokenId);
    if (!token) {
      throw new Error("Token not found");
    }

    const game = await ctx.db.get(token.gameId);
    if (!game || game.creatorId !== args.creatorId) {
      throw new Error("Only the game creator can delete tokens");
    }

    await ctx.db.delete(args.tokenId);
  },
});

// Get token info by token string (public - for vote page)
export const getTokenInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const voteToken = await ctx.db
      .query("voteTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!voteToken || !voteToken.isActive) {
      return null;
    }

    const game = await ctx.db.get(voteToken.gameId);
    if (!game) {
      return null;
    }

    return {
      gameId: voteToken.gameId,
      gameTitle: game.title,
      gameStatus: game.status,
      label: voteToken.label,
      isClaimed: !!voteToken.usedBy,
    };
  },
});
