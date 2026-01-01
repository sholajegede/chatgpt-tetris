import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Full CRUD + upsert helpers for linked accounts (OAuth)

export const getByProviderSubject = query({
  args: { provider: v.string(), subject: v.string() },
  handler: async (ctx, { provider, subject }) => {
    return await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", provider).eq("subject", subject)
      )
      .first();
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("linkedAccounts").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const createLinkedAccount = mutation({
  args: {
    provider: v.string(),
    subject: v.string(),
    userId: v.id("users"),
    profile: v.optional(v.object({})),
  },
  handler: async (ctx, { provider, subject, userId, profile }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", provider).eq("subject", subject)
      )
      .first();

    if (existing) {
      throw new Error("Linked account already exists for provider+subject");
    }

    return await ctx.db.insert("linkedAccounts", {
      provider,
      subject,
      userId,
      profile: profile ?? {},
      updatedAt: now,
    });
  },
});

export const patchLinkedAccount = mutation({
  args: {
    linkedAccountId: v.id("linkedAccounts"),
    userId: v.optional(v.id("users")),
    profile: v.optional(v.object({})),
  },
  handler: async (ctx, { linkedAccountId, userId, profile }) => {
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (userId !== undefined) patch.userId = userId;
    if (profile !== undefined) patch.profile = profile;
    return await ctx.db.patch(linkedAccountId, patch);
  },
});

export const deleteLinkedAccount = mutation({
  args: { linkedAccountId: v.id("linkedAccounts") },
  handler: async (ctx, { linkedAccountId }) => {
    return await ctx.db.delete(linkedAccountId);
  },
});

// Upsert on sign-in: returns the linked account record (and creates a user if necessary)
export const upsertOnSignIn = mutation({
  args: {
    provider: v.string(),
    subject: v.string(),
    profile: v.optional(v.object({})),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { provider, subject, profile, userId }) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", provider).eq("subject", subject)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { profile: profile ?? existing.profile, updatedAt: now });
      return await ctx.db.get(existing._id);
    }

    // If userId not supplied, try to find by email in profile
    let resolvedUserId = userId;
    const email = profile && (profile as any).email;
    if (!resolvedUserId && email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user) resolvedUserId = user._id;
    }

    // If still no user, create an account (email may be missing)
    if (!resolvedUserId) {
      const created = await ctx.db.insert("users", {
        email: email ?? `${provider}:${subject}`,
        displayName: profile && (profile as any).name,
        imageUrl: profile && (profile as any).picture,
        updatedAt: now,
      });
      resolvedUserId = created;
    }

    const inserted = await ctx.db.insert("linkedAccounts", {
      provider,
      subject,
      userId: resolvedUserId,
      profile: profile ?? {},
      updatedAt: now,
    });

    return inserted;
  },
});

