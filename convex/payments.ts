import { mutation, query, internalMutation } from "./_generated/server";
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
    throw new Error("Forbidden: only RWA managers and admins can perform this action");
  }
  return user;
}

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
    await requireRwaOrAdmin(ctx);
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
    const user = await requireRwaOrAdmin(ctx);
    await ctx.db.patch(args.paymentId, {
      status: "confirmed",
      paidAt: Date.now(),
      paymentMethod: args.paymentMethod,
      confirmedBy: user._id,
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
    const user = await requireRwaOrAdmin(ctx);
    // Caller must belong to the same society
    if (user.societyId !== args.societyId) {
      throw new Error("Forbidden: you do not manage this society");
    }
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

export const getMonthlyRevenue = query({
  args: { societyId: v.id("societies"), months: v.optional(v.number()) },
  handler: async (ctx, { societyId, months = 6 }) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const all = await ctx.db
      .query("payments")
      .withIndex("by_society", q => q.eq("societyId", societyId))
      .collect();
    const confirmed = all.filter(p => p.status === "confirmed" && p.paidAt);
    const result: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const amount = confirmed
        .filter(p => p.paidAt! >= start && p.paidAt! < end)
        .reduce((s, p) => s + p.amount, 0);
      result.push({ month: label, amount });
    }
    return result;
  },
});

export const autoGenerateMonthly = internalMutation({
  args: { societyId: v.id("societies") },
  handler: async (ctx, { societyId }) => {
    const charges = await ctx.db
      .query("maintenanceCharges")
      .withIndex("by_society", q => q.eq("societyId", societyId))
      .collect();
    if (charges.length === 0) return 0;
    const residents = await ctx.db
      .query("users")
      .withIndex("by_society", q => q.eq("societyId", societyId))
      .filter(q => q.eq(q.field("role"), "resident"))
      .collect();
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), charges[0].dueDay ?? 10).getTime();
    let created = 0;
    for (const resident of residents) {
      const charge = charges.find(c => c.flatType === (resident.flatType ?? "standard")) ?? charges[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const existing = await ctx.db
        .query("payments")
        .withIndex("by_resident", q =>
          q.eq("societyId", societyId).eq("residentId", resident._id)
        )
        .filter(q => q.gte(q.field("createdAt"), startOfMonth))
        .first();
      if (existing) continue;
      if (!resident.blockId) continue;
      await ctx.db.insert("payments", {
        societyId,
        blockId: resident.blockId,
        residentId: resident._id,
        type: "monthly_maintenance",
        description: `Maintenance — ${now.toLocaleString("default", { month: "long", year: "numeric" })}`,
        amount: charge.monthlyAmount,
        dueDate,
        status: "pending",
        createdAt: Date.now(),
      });
      created++;
    }
    return created;
  },
});
