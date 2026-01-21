import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users authenticated via GitHub
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_github_id", ["githubId"]),

  // Games created by users
  games: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    shortCode: v.string(), // Short URL code for sharing
    referenceImageUrl: v.string(), // The target image to recreate
    hexColors: v.array(v.object({
      name: v.string(), // e.g., "Background", "Primary Text", "Button"
      hex: v.string(),  // e.g., "#FF5733"
    })), // Color palette hints with names
    requirements: v.optional(v.string()), // Additional requirements
    durationMinutes: v.number(), // Default 15 minutes
    status: v.union(
      v.literal("draft"),
      v.literal("lobby"),
      v.literal("active"),
      v.literal("voting"),
      v.literal("finished")
    ),
    startedAt: v.optional(v.number()), // Timestamp when game started
    endedAt: v.optional(v.number()), // Timestamp when game ended
  })
    .index("by_short_code", ["shortCode"])
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),

  // Assets for a game (images, fonts, etc.)
  assets: defineTable({
    gameId: v.id("games"),
    shortCode: v.string(), // Short code for easy insertion
    name: v.string(),
    url: v.string(), // Public URL to the asset
    type: v.union(v.literal("image"), v.literal("font"), v.literal("other")),
  })
    .index("by_game", ["gameId"])
    .index("by_short_code", ["shortCode"]),

  // Players who joined a game
  players: defineTable({
    gameId: v.id("games"),
    userId: v.optional(v.id("users")), // Optional for guest players
    handle: v.string(), // Display name in the game
    joinedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_user_and_game", ["userId", "gameId"]),

  // Player entries (their submissions)
  entries: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    html: v.string(), // The submitted HTML code
    submittedAt: v.optional(v.number()),
    isSubmitted: v.boolean(),
    totalScore: v.number(), // Calculated score
    maxStreak: v.number(), // Highest streak achieved
    totalKeystrokes: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),

  // Progress snapshots for playback (saved every 15 seconds)
  progressSnapshots: defineTable({
    entryId: v.id("entries"),
    html: v.string(),
    streak: v.number(),
    powerMode: v.boolean(),
    keystrokeCount: v.number(),
    timestamp: v.number(), // Relative to game start
  }).index("by_entry", ["entryId"]),

  // Votes from game creator (and later guest judges)
  votes: defineTable({
    gameId: v.id("games"),
    entryId: v.id("entries"),
    judgeId: v.id("users"),
    score: v.number(), // 1-10 rating
    isWinner: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_entry", ["entryId"])
    .index("by_judge_and_game", ["judgeId", "gameId"]),

  // Vote tokens for guest judges
  voteTokens: defineTable({
    gameId: v.id("games"),
    token: v.string(), // Unique token for sharing
    label: v.optional(v.string()), // Optional label (e.g., "Judge 1")
    createdAt: v.number(),
    usedBy: v.optional(v.id("users")), // Once claimed by a user
    isActive: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_token", ["token"]),
});
