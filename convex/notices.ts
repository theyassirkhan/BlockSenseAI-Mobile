import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireRwaOrAdmin(ctx: any) {
  const authId = await getAuthUserId(ctx);
  if (!authId) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", authId as string))
    .first();
  if (!user) throw new Error("Profile not found");
  if (user.role !== "rwa" && user.role !== "admin" && user.role !== "platform_admin") {
    throw new Error("Forbidden: only RWA managers and admins can manage notices");
  }
  return user;
}

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
    const user = await requireRwaOrAdmin(ctx);
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
    const user = await requireRwaOrAdmin(ctx);
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");
    // Verify caller belongs to the same society as the notice
    if (user.societyId !== notice.societyId) {
      throw new Error("Forbidden: this notice does not belong to your society");
    }
    await ctx.db.delete(args.noticeId);
  },
});

export const acknowledge = mutation({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    const existing = await ctx.db
      .query("noticeAcks")
      .withIndex("by_user_notice", (q) => q.eq("userId", user._id).eq("noticeId", args.noticeId))
      .first();
    if (!existing) {
      await ctx.db.insert("noticeAcks", { noticeId: args.noticeId, userId: user._id, ackedAt: Date.now() });
    }
  },
});

export const getMyAcks = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) return [];
    const notices = await ctx.db
      .query("notices")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
    const acks = await Promise.all(
      notices.map(n =>
        ctx.db.query("noticeAcks")
          .withIndex("by_user_notice", (q) => q.eq("userId", user._id).eq("noticeId", n._id))
          .first()
      )
    );
    return notices.map((n, i) => n._id).filter((_, i) => acks[i] !== null);
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
    const user = await requireRwaOrAdmin(ctx);
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");
    if (user.societyId !== notice.societyId) {
      throw new Error("Forbidden: this notice does not belong to your society");
    }
    const { noticeId, ...patch } = args;
    await ctx.db.patch(noticeId, patch);
  },
});
