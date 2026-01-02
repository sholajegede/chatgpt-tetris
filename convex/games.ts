import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createGame = mutation({
  args: {
    userId: v.optional(v.id("users")),
    public: v.optional(v.boolean()),
    seed: v.optional(v.number()),
    board: v.optional(v.array(v.number())),
    currentPiece: v.optional(v.object({ type: v.string(), rotation: v.number(), x: v.number(), y: v.number() })),
    nextQueue: v.optional(v.array(v.string())),
    holdPiece: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const inserted = await ctx.db.insert("games", {
      userId: args.userId,
      status: "active",
      score: 0,
      level: 1,
      linesCleared: 0,
      board: args.board ?? [],
      currentPiece: args.currentPiece,
      nextQueue: args.nextQueue ?? [],
      holdPiece: args.holdPiece,
      seed: args.seed,
      replayId: undefined,
      public: args.public ?? false,
      updatedAt: now,
    });

    return inserted;
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.get(gameId);
  },
});

export const listByUser = query({
  args: { userId: v.id("users"), status: v.optional(v.string()) },
  handler: async (ctx, { userId, status }) => {
    const q = ctx.db.query("games").withIndex("by_user", (q) => q.eq("userId", userId));
    const all = await q.collect();
    if (status) return all.filter((g: any) => g.status === status);
    return all;
  },
});

export const patchGame = mutation({
  args: {
    gameId: v.id("games"),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("finished"), v.literal("abandoned"))),
    score: v.optional(v.number()),
    level: v.optional(v.number()),
    linesCleared: v.optional(v.number()),
    board: v.optional(v.array(v.number())),
    currentPiece: v.optional(v.object({ type: v.string(), rotation: v.optional(v.number()), x: v.number(), y: v.number() })),
    nextQueue: v.optional(v.array(v.string())),
    holdPiece: v.optional(v.string()),
    seed: v.optional(v.number()),
    replayId: v.optional(v.id("replays")),
    public: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.status !== undefined) patch.status = args.status;
    if (args.score !== undefined) patch.score = args.score;
    if (args.level !== undefined) patch.level = args.level;
    if (args.linesCleared !== undefined) patch.linesCleared = args.linesCleared;
    if (args.board !== undefined) patch.board = args.board;
    if (args.currentPiece !== undefined) patch.currentPiece = args.currentPiece;
    if (args.nextQueue !== undefined) patch.nextQueue = args.nextQueue;
    if (args.holdPiece !== undefined) patch.holdPiece = args.holdPiece;
    if (args.seed !== undefined) patch.seed = args.seed;
    if (args.replayId !== undefined) patch.replayId = args.replayId;
    if (args.public !== undefined) patch.public = args.public;

    return await ctx.db.patch(args.gameId, patch);
  },
});

export const setStatus = mutation({
  args: { gameId: v.id("games"), status: v.union(v.literal("active"), v.literal("paused"), v.literal("finished"), v.literal("abandoned")) },
  handler: async (ctx, { gameId, status }) => {
    return await ctx.db.patch(gameId, { status, updatedAt: Date.now() });
  },
});

export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
    score: v.number(),
    level: v.number(),
    linesCleared: v.number(),
    replayActions: v.optional(v.array(v.object({ t: v.number(), a: v.string(), p: v.optional(v.object({})) }))),
    durationMs: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { gameId, score, level, linesCleared, replayActions, durationMs, userId }) => {
    const now = Date.now();
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const finalUserId = userId ?? game.userId;

    let replayId = game.replayId ?? undefined;

    if (replayActions && replayActions.length > 0) {
      const insertedReplay = await ctx.db.insert("replays", {
        gameId,
        userId: finalUserId,
        actions: replayActions,
        durationMs: durationMs ?? 0,
      });
      replayId = insertedReplay;
    }

    await ctx.db.patch(gameId, {
      userId: finalUserId,
      status: "finished",
      score,
      level,
      linesCleared,
      replayId,
      updatedAt: now,
    });

    if (finalUserId) {
      await ctx.db.insert("leaderboards", {
        userId: finalUserId,
        score,
        level,
        linesCleared,
      });
    }

    return await ctx.db.get(gameId);
  },
});

export const deleteGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.delete(gameId);
  },
});

export const listPublicFinishedGames = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const finished = await ctx.db.query("games").withIndex("by_status", (q) => q.eq("status", "finished")).collect();
    const publicOnes = (finished as any[]).filter((g) => g.public === true);
    if (limit) return publicOnes.slice(0, limit);
    return publicOnes;
  },
});

export const getTopLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db.query("leaderboards").withIndex("by_score", (q) => q).collect();
    const sorted = (all as any[]).sort((a, b) => b.score - a.score);
    if (limit) return sorted.slice(0, limit);
    return sorted;
  },
});