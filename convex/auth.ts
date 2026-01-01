import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLink = query({
  args: { provider: v.string(), subject: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) => q.eq("provider", args.provider).eq("subject", args.subject))
      .first();
  },
});

export const linkAccount = mutation({
  args: {
    provider: v.string(),
    subject: v.string(),
    userId: v.id("users"),
    profile: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) => q.eq("provider", args.provider).eq("subject", args.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        profile: args.profile,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("linkedAccounts", {
      provider: args.provider,
      subject: args.subject,
      userId: args.userId,
      profile: args.profile,
      updatedAt: Date.now(),
    });
  },
});
