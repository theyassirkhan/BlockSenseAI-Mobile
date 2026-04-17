import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getTankLevels = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();
  },
});

export const addTank = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    name: v.string(),
    type: v.union(
      v.literal("overhead"),
      v.literal("sump"),
      v.literal("borewell_sump")
    ),
    capacityKL: v.number(),
    currentLevelPct: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("waterTanks", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const updateTankLevel = mutation({
  args: {
    tankId: v.id("waterTanks"),
    currentLevelPct: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.tankId, {
      currentLevelPct: args.currentLevelPct,
      lastUpdated: Date.now(),
    });
    const tank = await ctx.db.get(args.tankId);
    if (tank) {
      await ctx.scheduler.runAfter(
        0,
        internal.alerts.checkWaterThresholds,
        { societyId: tank.societyId, blockId: tank.blockId }
      );
    }
  },
});

export const addWaterReading = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    source: v.union(
      v.literal("cauvery"),
      v.literal("borewell"),
      v.literal("tanker"),
      v.literal("rainwater")
    ),
    readingType: v.union(
      v.literal("inflow"),
      v.literal("consumption"),
      v.literal("tank_level")
    ),
    value: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User profile not found");

    const id = await ctx.db.insert("waterReadings", {
      ...args,
      unit: "kl",
      recordedBy: user._id,
      recordedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.alerts.checkWaterThresholds,
      { societyId: args.societyId, blockId: args.blockId }
    );
    return id;
  },
});

export const getRecentReadings = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const since = Date.now() - (args.days ?? 7) * 24 * 60 * 60 * 1000;
    const readings = await ctx.db
      .query("waterReadings")
      .withIndex("by_recorded_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("recordedAt", since)
      )
      .order("desc")
      .collect();
    return readings;
  },
});

export const getWaterPrediction = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const readings = await ctx.db
      .query("waterReadings")
      .withIndex("by_recorded_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("recordedAt", last7Days)
      )
      .filter((q) => q.eq(q.field("readingType"), "consumption"))
      .collect();

    const totalConsumption = readings.reduce((sum, r) => sum + r.value, 0);
    const avgDailyConsumption = readings.length > 0 ? totalConsumption / 7 : 0;

    const tanks = await ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();

    const totalCapacityKL = tanks.reduce((sum, t) => sum + t.capacityKL, 0);
    const totalCurrentKL = tanks.reduce(
      (sum, t) => sum + (t.capacityKL * t.currentLevelPct) / 100,
      0
    );
    const criticalThresholdKL = totalCapacityKL * 0.2;

    const daysUntilCritical =
      avgDailyConsumption > 0
        ? (totalCurrentKL - criticalThresholdKL) / avgDailyConsumption
        : 999;

    return {
      avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
      totalCurrentKL: Math.round(totalCurrentKL * 100) / 100,
      totalCapacityKL,
      daysUntilCritical: Math.max(0, Math.round(daysUntilCritical * 10) / 10),
      recommendedOrderDate:
        Date.now() +
        Math.max(0, daysUntilCritical - 1.5) * 24 * 60 * 60 * 1000,
      confidence: "rule_v1" as const,
    };
  },
});

export const createTankerOrder = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    vendorId: v.id("vendors"),
    quantityKL: v.number(),
    scheduledAt: v.optional(v.number()),
    triggeredBy: v.string(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();

    const orderId = await ctx.db.insert("tankerOrders", {
      ...args,
      status: "pending",
      orderedBy: user?._id,
      createdAt: Date.now(),
    });

    const vendor = await ctx.db.get(args.vendorId);
    if (vendor?.whatsapp) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.notifyVendorTankerOrder,
        {
          societyId: args.societyId,
          vendorId: args.vendorId,
          orderId,
          quantityKL: args.quantityKL,
        }
      );
    }
    return orderId;
  },
});

export const getTankerOrders = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("tankerOrders")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .take(20);
  },
});

export const getWeeklyConsumption = internalQuery({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const readings = await ctx.db
      .query("waterReadings")
      .withIndex("by_recorded_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("recordedAt", args.since)
      )
      .filter((q) => q.eq(q.field("readingType"), "consumption"))
      .collect();
    const totalKL =
      Math.round(readings.reduce((s, r) => s + r.value, 0) * 10) / 10;
    return { totalKL, count: readings.length };
  },
});

export const updateTankerStatus = mutation({
  args: {
    orderId: v.id("tankerOrders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { orderId, ...patch } = args;
    await ctx.db.patch(orderId, {
      ...patch,
      ...(args.status === "delivered" ? { deliveredAt: Date.now() } : {}),
    });
  },
});
