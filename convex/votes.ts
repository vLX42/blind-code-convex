import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to check if user can vote
async function canUserVoteOnGame(
  ctx: MutationCtx,
  gameId: Id<"games">,
  userId: Id<"users">
): Promise<boolean> {
  const game = await ctx.db.get(gameId);
  if (!game) return false;

  // Creator can always vote
  if (game.creatorId === userId) return true;

  // Check for valid vote token
  const token = await ctx.db
    .query("voteTokens")
    .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("usedBy"), userId),
        q.eq(q.field("isActive"), true)
      )
    )
    .first();

  return !!token;
}

// Cast a vote for an entry
export const castVote = mutation({
  args: {
    gameId: v.id("games"),
    entryId: v.id("entries"),
    judgeId: v.id("users"),
    score: v.number(), // 1-10
  },
  handler: async (ctx, args) => {
    // Verify user is authorized to vote
    const canVote = await canUserVoteOnGame(ctx, args.gameId, args.judgeId);
    if (!canVote) {
      throw new Error("You are not authorized to vote on this game");
    }

    // Check if vote already exists
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_judge_and_game", (q) =>
        q.eq("judgeId", args.judgeId).eq("gameId", args.gameId)
      )
      .filter((q) => q.eq(q.field("entryId"), args.entryId))
      .first();

    if (existing) {
      // Update existing vote
      await ctx.db.patch(existing._id, { score: args.score });
      return existing._id;
    }

    // Create new vote
    return await ctx.db.insert("votes", {
      gameId: args.gameId,
      entryId: args.entryId,
      judgeId: args.judgeId,
      score: args.score,
      isWinner: false,
    });
  },
});

// Get all votes for a game
export const getGameVotes = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Get votes for a specific entry
export const getEntryVotes = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
  },
});

// Get a user's votes for a game
export const getUserVotesForGame = query({
  args: {
    gameId: v.id("games"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_judge_and_game", (q) =>
        q.eq("judgeId", args.userId).eq("gameId", args.gameId)
      )
      .collect();
  },
});

// Mark an entry as winner
export const selectWinner = mutation({
  args: {
    gameId: v.id("games"),
    entryId: v.id("entries"),
    judgeId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user is authorized to vote
    const canVote = await canUserVoteOnGame(ctx, args.gameId, args.judgeId);
    if (!canVote) {
      throw new Error("You are not authorized to vote on this game");
    }

    // First, reset any existing winner selections by this judge
    const existingWinners = await ctx.db
      .query("votes")
      .withIndex("by_judge_and_game", (q) =>
        q.eq("judgeId", args.judgeId).eq("gameId", args.gameId)
      )
      .filter((q) => q.eq(q.field("isWinner"), true))
      .collect();

    for (const vote of existingWinners) {
      await ctx.db.patch(vote._id, { isWinner: false });
    }

    // Check if a vote exists for this entry
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_judge_and_game", (q) =>
        q.eq("judgeId", args.judgeId).eq("gameId", args.gameId)
      )
      .filter((q) => q.eq(q.field("entryId"), args.entryId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isWinner: true });
      return existing._id;
    }

    // Create a new vote with winner status
    return await ctx.db.insert("votes", {
      gameId: args.gameId,
      entryId: args.entryId,
      judgeId: args.judgeId,
      score: 10, // Max score for winner
      isWinner: true,
    });
  },
});

// Get the winner(s) of a game
export const getWinners = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const winnerVotes = await ctx.db
      .query("votes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isWinner"), true))
      .collect();

    // Get entry and player info for each winner
    const winners = await Promise.all(
      winnerVotes.map(async (vote) => {
        const entry = await ctx.db.get(vote.entryId);
        if (!entry) return null;
        const player = await ctx.db.get(entry.playerId);
        return { vote, entry, player };
      })
    );

    return winners.filter((w) => w !== null);
  },
});

// Get leaderboard with vote totals
export const getLeaderboard = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    // Get all entries for the game (not just submitted ones)
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const leaderboard = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
          .collect();

        const totalVoteScore = votes.reduce((sum, v) => sum + v.score, 0);
        const isWinner = votes.some((v) => v.isWinner);

        return {
          entry,
          player,
          votes,
          totalVoteScore,
          isWinner,
          // Combined score: typing performance + judge votes
          combinedScore: entry.totalScore + totalVoteScore * 10,
        };
      })
    );

    return leaderboard.sort((a, b) => b.combinedScore - a.combinedScore);
  },
});
