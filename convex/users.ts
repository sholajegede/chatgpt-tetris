import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const getMultipleById = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, { userIds }) => {
    const users = await Promise.all(
      userIds.map(id => ctx.db.get(id))
    );
    return users;
  },
});

export const createOrUpdate = mutation({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, {
        displayName: args.displayName ?? existingUser.displayName,
        firstName: args.firstName ?? existingUser.firstName,
        lastName: args.lastName ?? existingUser.lastName,
        imageUrl: args.imageUrl ?? existingUser.imageUrl,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("users", {
      email: args.email,
      displayName: args.displayName,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      updatedAt: now,
    });
  },
});

export const patchProfile = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.firstName !== undefined) patch.firstName = args.firstName;
    if (args.lastName !== undefined) patch.lastName = args.lastName;
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.imageStorageId !== undefined) patch.imageStorageId = args.imageStorageId;

    return await ctx.db.patch(args.userId, patch);
  },
});

export const upsertLinkedAccount = mutation({
  args: {
    provider: v.string(),
    subject: v.string(),
    profile: v.optional(v.object({})),
  },
  handler: async (ctx, { provider, subject, profile }) => {
    const now = Date.now();

    const linked = await ctx.db
      .query("linkedAccounts")
      .withIndex("by_provider_subject", (q) => q.eq("provider", provider).eq("subject", subject))
      .first();

    if (linked) {
      await ctx.db.patch(linked._id, { profile: profile ?? linked.profile, updatedAt: now });
      return linked.userId;
    }

    let user = null;
    const email = profile && (profile as any).email;
    if (email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      const created = await ctx.db.insert("users", {
        email: email ?? `${provider}:${subject}`,
        displayName: profile && (profile as any).name,
        imageUrl: profile && (profile as any).picture,
        updatedAt: now,
      });
      user = created;
    }
    
    const userId = typeof user === "string" ? user : user._id;
    const linkedInsert = await ctx.db.insert("linkedAccounts", {
      provider,
      subject,
      userId: userId,
      profile: profile ?? {},
      updatedAt: now,
    });

    return userId;
  },
});