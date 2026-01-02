import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createReplay = mutation({
  args: {
    gameId: v.id("games"),
    userId: v.optional(v.id("users")),
    actions: v.array(v.object({ t: v.number(), a: v.string(), p: v.optional(v.object({})) })),
    durationMs: v.number(),
  },
  handler: async (ctx, { gameId, userId, actions, durationMs }) => {
    return await ctx.db.insert("replays", {
      gameId,
      userId,
      actions,
      durationMs,
    });
  },
});

export const getReplay = query({
  args: { replayId: v.id("replays") },
  handler: async (ctx, { replayId }) => {
    return await ctx.db.get(replayId);
  },
});

export const listByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("replays")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("replays")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

export const patchReplay = mutation({
  args: {
    replayId: v.id("replays"),
    actions: v.optional(v.array(v.object({ t: v.number(), a: v.string(), p: v.optional(v.object({})) }))),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, { replayId, actions, durationMs }) => {
    const patch: Record<string, any> = {};
    if (actions !== undefined) patch.actions = actions;
    if (durationMs !== undefined) patch.durationMs = durationMs;
    return await ctx.db.patch(replayId, patch);
  },
});

export const deleteReplay = mutation({
  args: { replayId: v.id("replays") },
  handler: async (ctx, { replayId }) => {
    return await ctx.db.delete(replayId);
  },
});

export const getRecentReplays = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("replays")
      .order("desc")
      .take(limit ?? 10);
  },
});

export const getRecentReplaysWithDetails = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const replays = await ctx.db
      .query("replays")
      .order("desc")
      .take(limit ?? 10);
    
    const withDetails = await Promise.all(
      replays.map(async (replay) => {
        const game = replay.gameId ? await ctx.db.get(replay.gameId) : null;
        const user = replay.userId ? await ctx.db.get(replay.userId) : null;
        
        return {
          ...replay,
          game,
          user,
        };
      })
    );
    
    return withDetails;
  },
});

export const getTopReplays = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const replays = await ctx.db.query("replays").collect();
    
    const withScores = await Promise.all(
      replays.map(async (replay) => {
        const game = await ctx.db.get(replay.gameId);
        return {
          ...replay,
          game,
          score: game?.score ?? 0,
        };
      })
    );
    
    const sorted = withScores.sort((a, b) => b.score - a.score);
    
    return limit ? sorted.slice(0, limit) : sorted;
  },
});