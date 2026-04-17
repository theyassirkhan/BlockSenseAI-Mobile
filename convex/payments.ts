import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMyDues = query({
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
      .query("payments")
      .withIndex("by_resident", (q) =>
        q.eq("societyId", args.societyId).eq("residentId", user._id)
      )
      .order("desc")
      .collect();
  },
});

export const getBySociety = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.optional(v.id("blocks")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const all = await ctx.db
      .query("payments")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(200);
    return all.filter(
      (p) =>
        (!args.blockId || p.blockId === args.blockId) &&
        (!args.status || p.status === args.status)
    );
  },
});

export const recordPayment = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    residentId: v.id("users"),
    type: v.union(
      v.literal("monthly_maintenance"),
      v.literal("one_time"),
      v.literal("penalty"),
      v.literal("other")
    ),
    description: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    paymentMethod: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("upi"),
        v.literal("bank_transfer"),
        v.literal("online")
      )
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("payments", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const confirmPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("upi"),
      v.literal("bank_transfer"),
      v.literal("online")
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    await ctx.db.patch(args.paymentId, {
      status: "confirmed",
      paidAt: Date.now(),
      paymentMethod: args.paymentMethod,
      confirmedBy: user?._id,
    });
  },
});

export const submitScreenshot = mutation({
  args: {
    paymentId: v.id("payments"),
    screenshotStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.paymentId, {
      screenshotStorageId: args.screenshotStorageId,
      status: "pending_confirmation",
    });
  },
});

export const getMaintenanceCharges = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("maintenanceCharges")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});

export const setMaintenanceCharge = mutation({
  args: {
    societyId: v.id("societies"),
    flatType: v.string(),
    monthlyAmount: v.number(),
    dueDay: v.number(),
    lateFeeAmount: v.optional(v.number()),
    lateFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("maintenanceCharges")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .filter((q) => q.eq(q.field("flatType"), args.flatType))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, effectiveFrom: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("maintenanceCharges", {
      ...args,
      effectiveFrom: Date.now(),
    });
  },
});

export const getSummary = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const all = await ctx.db
      .query("payments")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    const thisMonth = all.filter((p) => p.createdAt >= startOfMonth.getTime());
    const confirmed = thisMonth.filter((p) => p.status === "confirmed");
    const overdue = all.filter((p) => p.status === "overdue" || (p.status === "pending" && p.dueDate < now));

    return {
      totalCollectedThisMonth: confirmed.reduce((s, p) => s + p.amount, 0),
      totalOutstanding: overdue.reduce((s, p) => s + p.amount, 0),
      overdueCount: overdue.length,
      collectedCount: confirmed.length,
    };
  },
});
