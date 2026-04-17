import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.optional(v.id("blocks")),
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("emergency"),
      v.literal("maintenance"),
      v.literal("general"),
      v.literal("payment")
    ),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    return ctx.db.insert("notices", {
      ...args,
      isPinned: args.isPinned ?? false,
      postedBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const getBySociety = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.optional(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const now = Date.now();
    const all = await ctx.db
      .query("notices")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .collect();
    return all
      .filter(
        (n) =>
          (!n.expiresAt || n.expiresAt > now) &&
          (!args.blockId || !n.blockId || n.blockId === args.blockId)
      )
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);
  },
});

export const remove = mutation({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.delete(args.noticeId);
  },
});

export const update = mutation({
  args: {
    noticeId: v.id("notices"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { noticeId, ...patch } = args;
    await ctx.db.patch(noticeId, patch);
  },
});
