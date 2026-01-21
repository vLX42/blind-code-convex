import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update user after GitHub OAuth
export const upsertUser = mutation({
  args: {
    githubId: v.string(),
    username: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        name: args.name,
        avatarUrl: args.avatarUrl,
        email: args.email,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", args);
  },
});

// Get user by GitHub ID
export const getUserByGithubId = query({
  args: { githubId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
