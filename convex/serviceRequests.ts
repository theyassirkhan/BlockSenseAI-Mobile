import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    category: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("urgent")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    return ctx.db.insert("serviceRequests", {
      ...args,
      residentId: user._id,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const getMyRequests = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) return [];
    return ctx.db
      .query("serviceRequests")
      .withIndex("by_resident", (q) =>
        q.eq("societyId", args.societyId).eq("residentId", user._id)
      )
      .order("desc")
      .collect();
  },
});

export const getBySociety = query({
  args: { societyId: v.id("societies"), blockId: v.optional(v.id("blocks")) },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const all = await ctx.db
      .query("serviceRequests")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(100);
    if (args.blockId) return all.filter((r) => r.blockId === args.blockId);
    return all;
  },
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("serviceRequests"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    assignedTo: v.optional(v.id("users")),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { requestId, ...patch } = args;
    await ctx.db.patch(requestId, {
      ...patch,
      ...(args.status === "resolved" ? { resolvedAt: Date.now() } : {}),
    });
  },
});

export const rate = mutation({
  args: { requestId: v.id("serviceRequests"), rating: v.number() },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.requestId, {
      residentRating: args.rating,
      status: "closed",
    });
  },
});
