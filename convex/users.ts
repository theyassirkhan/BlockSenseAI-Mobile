import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId as any);
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return null;
    const authUser = await ctx.db.get(authId as any);
    if (!authUser) return null;
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", authUser._id as string)
      )
      .first();
    return profile;
  },
});

export const createProfile = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("rwa"), v.literal("resident")),
    societyId: v.optional(v.id("societies")),
    blockId: v.optional(v.id("blocks")),
    flatNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", authId as string)
      )
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("users", {
      ...args,
      isActive: true,
      tokenIdentifier: authId as string,
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    flatNumber: v.optional(v.string()),
    blockId: v.optional(v.id("blocks")),
    defaultBlockId: v.optional(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, args);
    return profile._id;
  },
});

export const getBySociety = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("users")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});

export const getRWAMembers = internalQuery({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
    return members.filter(
      (m) => m.role === "rwa" || m.role === "admin"
    );
  },
});

export const setActiveSociety = mutation({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, { societyId: args.societyId });
  },
});
