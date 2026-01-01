import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    displayName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  linkedAccounts: defineTable({
    provider: v.string(),
    subject: v.string(),
    userId: v.id("users"),
    profile: v.optional(v.object({})),
    updatedAt: v.number(),
  }).index("by_provider_subject", ["provider", "subject"]).index("by_user", ["userId"]),

  games: defineTable({
    userId: v.optional(v.id("users")),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("finished"),
      v.literal("abandoned")
    ),
    score: v.number(),
    level: v.number(),
    linesCleared: v.number(),
    board: v.array(v.number()),
    currentPiece: v.optional(
      v.object({ type: v.string(), rotation: v.number(), x: v.number(), y: v.number() })
    ),
    nextQueue: v.optional(v.array(v.string())),
    holdPiece: v.optional(v.string()),
    seed: v.optional(v.number()),
    replayId: v.optional(v.id("replays")),
    public: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_score", ["score"]),

  replays: defineTable({
    gameId: v.id("games"),
    userId: v.optional(v.id("users")),
    actions: v.array(v.object({ t: v.number(), a: v.string(), p: v.optional(v.object({})) })),
    durationMs: v.number(),
  }).index("by_game", ["gameId"]),

  leaderboards: defineTable({
    userId: v.id("users"),
    score: v.number(),
    level: v.number(),
    linesCleared: v.number(),
  }).index("by_score", ["score"]),
});