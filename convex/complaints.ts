import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    subject: v.string(),
    description: v.string(),
    category: v.string(),
    severity: v.union(v.literal("minor"), v.literal("moderate"), v.literal("serious")),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    return ctx.db.insert("complaints", {
      ...args,
      residentId: user._id,
      status: "open",
      escalatedToAdmin: false,
      createdAt: Date.now(),
    });
  },
});

export const getMyComplaints = query({
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
      .query("complaints")
      .withIndex("by_resident", (q) =>
        q.eq("societyId", args.societyId).eq("residentId", user._id)
      )
      .order("desc")
      .collect();
  },
});

export const getBySociety = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("complaints")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(100);
  },
});

export const respond = mutation({
  args: {
    complaintId: v.id("complaints"),
    rwaResponse: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("resolved"),
      v.literal("escalated")
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    if (user.role !== "rwa" && user.role !== "admin" && user.role !== "platform_admin") {
      throw new Error("Forbidden: only RWA managers and admins can respond to complaints");
    }
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");
    if (user.societyId !== complaint.societyId) {
      throw new Error("Forbidden: this complaint does not belong to your society");
    }
    await ctx.db.patch(args.complaintId, {
      rwaResponse: args.rwaResponse,
      status: args.status,
      escalatedToAdmin: args.status === "escalated",
    });
  },
});
