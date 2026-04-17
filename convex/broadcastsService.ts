import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const send = mutation({
  args: {
    societyId: v.optional(v.id("societies")),
    blockId: v.optional(v.id("blocks")),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("alert"),
      v.literal("warning"),
      v.literal("info"),
      v.literal("maintenance")
    ),
    targetAudience: v.string(),
    channels: v.array(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    return ctx.db.insert("broadcasts", {
      ...args,
      sentBy: user._id,
      sentCount: 0,
      sentAt: args.scheduledAt ? undefined : Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const getBySociety = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("broadcasts")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(50);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.query("broadcasts").order("desc").take(100);
  },
});
