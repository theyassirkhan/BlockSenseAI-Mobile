import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getDGUnits = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("dgUnits")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();
  },
});

export const addDGUnit = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    name: v.string(),
    capacityKVA: v.number(),
    dieselCapacityLiters: v.number(),
    dieselLevelLiters: v.number(),
    consumptionRateLPH: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("dgUnits", {
      ...args,
      isRunning: false,
      totalRuntimeHours: 0,
      lastUpdated: Date.now(),
    });
  },
});

export const addPowerReading = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    source: v.union(v.literal("grid"), v.literal("solar"), v.literal("dg")),
    readingType: v.union(
      v.literal("generation"),
      v.literal("consumption"),
      v.literal("export")
    ),
    valueKWH: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User profile not found");

    const id = await ctx.db.insert("powerReadings", {
      ...args,
      recordedBy: user._id,
      recordedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.alerts.checkPowerThresholds,
      { societyId: args.societyId, blockId: args.blockId }
    );
    return id;
  },
});

export const getRecentPowerReadings = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const since = Date.now() - (args.days ?? 7) * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("powerReadings")
      .withIndex("by_recorded_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("recordedAt", since)
      )
      .order("desc")
      .collect();
  },
});

export const startOutage = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    dgUnitId: v.optional(v.id("dgUnits")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User profile not found");

    if (args.dgUnitId) {
      await ctx.db.patch(args.dgUnitId, { isRunning: true, lastUpdated: Date.now() });
    }

    return ctx.db.insert("powerOutages", {
      societyId: args.societyId,
      blockId: args.blockId,
      dgUnitId: args.dgUnitId,
      startedAt: Date.now(),
      loggedBy: user._id,
    });
  },
});

export const endOutage = mutation({
  args: {
    outageId: v.id("powerOutages"),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const outage = await ctx.db.get(args.outageId);
    if (!outage) throw new Error("Outage not found");

    const endedAt = Date.now();
    const durationHrs = (endedAt - outage.startedAt) / (1000 * 60 * 60);

    if (outage.dgUnitId) {
      const dg = await ctx.db.get(outage.dgUnitId);
      if (dg) {
        const dieselUsedL = durationHrs * dg.consumptionRateLPH;
        await ctx.db.patch(outage.dgUnitId, {
          isRunning: false,
          dieselLevelLiters: Math.max(0, dg.dieselLevelLiters - dieselUsedL),
          totalRuntimeHours: dg.totalRuntimeHours + durationHrs,
          lastUpdated: Date.now(),
        });
        await ctx.db.patch(args.outageId, {
          endedAt,
          durationHrs: Math.round(durationHrs * 100) / 100,
          dieselUsedL: Math.round(dieselUsedL * 100) / 100,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.alerts.checkPowerThresholds,
          { societyId: outage.societyId, blockId: outage.blockId }
        );
        return;
      }
    }

    await ctx.db.patch(args.outageId, {
      endedAt,
      durationHrs: Math.round(durationHrs * 100) / 100,
    });
  },
});

export const getActiveOutage = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("powerOutages")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .first();
  },
});

export const refuelDG = mutation({
  args: {
    dgUnitId: v.id("dgUnits"),
    litersAdded: v.number(),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const dg = await ctx.db.get(args.dgUnitId);
    if (!dg) throw new Error("DG unit not found");
    await ctx.db.patch(args.dgUnitId, {
      dieselLevelLiters: Math.min(
        dg.dieselCapacityLiters,
        dg.dieselLevelLiters + args.litersAdded
      ),
      lastUpdated: Date.now(),
    });
  },
});

export const getDieselPrediction = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const dgUnits = await ctx.db
      .query("dgUnits")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();

    return dgUnits.map((dg) => {
      const hoursRemaining =
        dg.consumptionRateLPH > 0
          ? dg.dieselLevelLiters / dg.consumptionRateLPH
          : 999;
      const levelPct = (dg.dieselLevelLiters / dg.dieselCapacityLiters) * 100;
      return {
        dgId: dg._id,
        name: dg.name,
        dieselLevelLiters: dg.dieselLevelLiters,
        dieselCapacityLiters: dg.dieselCapacityLiters,
        levelPct: Math.round(levelPct),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        isRunning: dg.isRunning,
        isCritical: levelPct < 20,
      };
    });
  },
});
