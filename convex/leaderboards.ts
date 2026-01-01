import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const insertScore = mutation({
  args: {
    userId: v.id("users"),
    score: v.number(),
    level: v.number(),
    linesCleared: v.number(),
  },
  handler: async (ctx, { userId, score, level, linesCleared }) => {
    const now = Date.now();
    return await ctx.db.insert("leaderboards", {
      userId,
      score,
      level,
      linesCleared,
    });
  },
});

export const getEntry = query({
  args: { entryId: v.id("leaderboards") },
  handler: async (ctx, { entryId }) => {
    return await ctx.db.get(entryId);
  },
});

export const listTop = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    // Use the by_score index then sort descending (Convex indexes are ascending)
    const all = await ctx.db.query("leaderboards").withIndex("by_score").collect();
    const sorted = (all as any[]).sort((a, b) => b.score - a.score);
    if (limit) return sorted.slice(0, limit);
    return sorted;
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("leaderboards").filter((q) => q.eq(q.field("userId"), userId)).collect();
  },
});

export const patchEntry = mutation({
  args: {
    entryId: v.id("leaderboards"),
    score: v.optional(v.number()),
    level: v.optional(v.number()),
    linesCleared: v.optional(v.number()),
  },
  handler: async (ctx, { entryId, score, level, linesCleared }) => {
    const patch: Record<string, any> = {};
    if (score !== undefined) patch.score = score;
    if (level !== undefined) patch.level = level;
    if (linesCleared !== undefined) patch.linesCleared = linesCleared;
    return await ctx.db.patch(entryId, patch);
  },
});

export const deleteEntry = mutation({
  args: { entryId: v.id("leaderboards") },
  handler: async (ctx, { entryId }) => {
    return await ctx.db.delete(entryId);
  },
});

// Optional: prune old entries older than maxAgeMs, returns deleted count
export const pruneOldEntries = mutation({
  args: { maxAgeMs: v.number() },
  handler: async (ctx, { maxAgeMs }) => {
    const cutoff = Date.now() - maxAgeMs;
    const all = await ctx.db.query("leaderboards").collect();
    const toDelete = (all as any[]).filter((e) => (e._creationTime || 0) < cutoff);
    for (const e of toDelete) await ctx.db.delete(e._id);
    return toDelete.length;
  },
});