import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_VOTES = 2; // first + second choice
const POINTS_BY_RANK: Record<number, number> = { 1: 2, 2: 1 };

// How many votes a given voter is allowed to cast in this game.
// A voter cannot vote for their own entry, so the cap is the smaller of
// MAX_VOTES and the number of OTHER submitted entries.
async function votesAllowedForVoter(
  ctx: QueryCtx,
  gameId: Id<"games">,
  voterPlayerId: Id<"players">
): Promise<number> {
  const entries = await ctx.db
    .query("entries")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();

  const otherEntries = entries.filter(
    (e) => e.playerId !== voterPlayerId && e.isSubmitted
  );
  return Math.min(MAX_VOTES, otherEntries.length);
}

// Cast or update one of the voter's ranked votes (rank 1 = first, rank 2 = second).
export const setVote = mutation({
  args: {
    gameId: v.id("games"),
    voterPlayerId: v.id("players"),
    entryId: v.id("entries"),
    rank: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.rank !== 1 && args.rank !== 2) {
      throw new Error("Rank must be 1 (first choice) or 2 (second choice)");
    }

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.votingMode !== "participant") {
      throw new Error("This game is not using participant voting");
    }
    if (game.votingPhase !== "voting") {
      throw new Error("Voting is not currently open");
    }

    // Voter must be a player in this game.
    const voter = await ctx.db.get(args.voterPlayerId);
    if (!voter || voter.gameId !== args.gameId) {
      throw new Error("You are not a player in this game");
    }

    // Entry must belong to this game and not be the voter's own.
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.gameId !== args.gameId) {
      throw new Error("Submission not found");
    }
    if (entry.playerId === args.voterPlayerId) {
      throw new Error("You can't vote for your own submission");
    }

    // Respect the per-voter cap (e.g. only 1 vote when there's only 1 rival).
    const allowed = await votesAllowedForVoter(
      ctx,
      args.gameId,
      args.voterPlayerId
    );
    if (args.rank > allowed) {
      throw new Error("Not enough submissions for that vote");
    }

    const myVotes = await ctx.db
      .query("participantVotes")
      .withIndex("by_voter_and_game", (q) =>
        q.eq("voterPlayerId", args.voterPlayerId).eq("gameId", args.gameId)
      )
      .collect();

    // The two ranks must point at distinct entries. If this entry is already
    // used for the other rank, clear that other rank (the user is moving it).
    const otherRankVote = myVotes.find(
      (vote) => vote.rank !== args.rank && vote.entryId === args.entryId
    );
    if (otherRankVote) {
      await ctx.db.delete(otherRankVote._id);
    }

    const sameRankVote = myVotes.find((vote) => vote.rank === args.rank);
    if (sameRankVote) {
      await ctx.db.patch(sameRankVote._id, { entryId: args.entryId });
      return sameRankVote._id;
    }

    return await ctx.db.insert("participantVotes", {
      gameId: args.gameId,
      voterPlayerId: args.voterPlayerId,
      entryId: args.entryId,
      rank: args.rank,
    });
  },
});

// Remove one of the voter's ranked votes (lets them vote for fewer entries).
export const clearVote = mutation({
  args: {
    gameId: v.id("games"),
    voterPlayerId: v.id("players"),
    rank: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.votingPhase !== "voting") {
      throw new Error("Voting is not currently open");
    }

    const existing = await ctx.db
      .query("participantVotes")
      .withIndex("by_voter_and_game", (q) =>
        q.eq("voterPlayerId", args.voterPlayerId).eq("gameId", args.gameId)
      )
      .filter((q) => q.eq(q.field("rank"), args.rank))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// The current voter's own ranked votes, plus how many votes they may cast.
export const getMyParticipantVotes = query({
  args: {
    gameId: v.id("games"),
    voterPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("participantVotes")
      .withIndex("by_voter_and_game", (q) =>
        q.eq("voterPlayerId", args.voterPlayerId).eq("gameId", args.gameId)
      )
      .collect();

    const votesAllowed = await votesAllowedForVoter(
      ctx,
      args.gameId,
      args.voterPlayerId
    );

    return { votes, votesAllowed };
  },
});

// Live voting progress for the host: how many eligible voters have voted.
export const getParticipantVoteStatus = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    // Eligible voters = players who themselves have a submitted entry, since a
    // participant only makes sense as a voter if they took part. (Everyone with
    // a submission can vote; their own entry is simply excluded.)
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    const submittedEntries = entries.filter((e) => e.isSubmitted);

    // A voter is "eligible" only if there is at least one other entry to vote on.
    const eligiblePlayerIds = new Set(
      submittedEntries
        .filter(
          (e) => submittedEntries.some((other) => other.playerId !== e.playerId)
        )
        .map((e) => e.playerId as string)
    );

    const votes = await ctx.db
      .query("participantVotes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Distinct voters who have cast at least one vote (counting only those who
    // are eligible participants, so the host's own votes don't skew the ratio).
    const votedPlayerIds = new Set(
      votes
        .map((vote) => vote.voterPlayerId as string)
        .filter((id) => eligiblePlayerIds.has(id))
    );

    return {
      eligibleCount: eligiblePlayerIds.size,
      votedCount: votedPlayerIds.size,
      totalVotesCast: votes.length,
    };
  },
});

// Ranked results: each entry's total points (rank1=2, rank2=1) with player info.
// Sorted best-first. Ties broken by typing score.
export const getParticipantResults = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isSubmitted"), true))
      .collect();

    const results = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const votes = await ctx.db
          .query("participantVotes")
          .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
          .collect();

        let points = 0;
        let firstPlaceVotes = 0;
        let secondPlaceVotes = 0;
        for (const vote of votes) {
          points += POINTS_BY_RANK[vote.rank] ?? 0;
          if (vote.rank === 1) firstPlaceVotes += 1;
          if (vote.rank === 2) secondPlaceVotes += 1;
        }

        return {
          entry,
          player,
          points,
          firstPlaceVotes,
          secondPlaceVotes,
          totalVotes: votes.length,
        };
      })
    );

    return results.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.firstPlaceVotes !== a.firstPlaceVotes)
        return b.firstPlaceVotes - a.firstPlaceVotes;
      return b.entry.totalScore - a.entry.totalScore;
    });
  },
});
