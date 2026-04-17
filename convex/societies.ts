import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    city: v.string(),
    totalFlats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("societies", {
      ...args,
      subscriptionPlan: "basic",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.get(args.societyId);
  },
});

export const update = mutation({
  args: {
    societyId: v.id("societies"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    totalFlats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { societyId, ...patch } = args;
    await ctx.db.patch(societyId, patch);
  },
});

export const addBlock = mutation({
  args: {
    societyId: v.id("societies"),
    name: v.string(),
    type: v.union(
      v.literal("block"),
      v.literal("wing"),
      v.literal("villa"),
      v.literal("tower")
    ),
    totalFlats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const blockId = await ctx.db.insert("blocks", {
      ...args,
      createdAt: Date.now(),
    });
    const society = await ctx.db.get(args.societyId);
    if (society) {
      await ctx.db.patch(args.societyId, {
        totalBlocks: (society.totalBlocks ?? 0) + 1,
      });
    }
    return blockId;
  },
});

export const getBlocks = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});

export const updateBlock = mutation({
  args: {
    blockId: v.id("blocks"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("block"),
        v.literal("wing"),
        v.literal("villa"),
        v.literal("tower")
      )
    ),
    totalFlats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { blockId, ...patch } = args;
    await ctx.db.patch(blockId, patch);
  },
});

export const getHealthScore = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const now = Date.now();
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    // Water score (0-40): based on average tank level
    const tanks = await ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();
    const avgTankLevel =
      tanks.length > 0
        ? tanks.reduce((s, t) => s + t.currentLevelPct, 0) / tanks.length
        : 50;
    const waterScore = Math.round(avgTankLevel * 0.4); // max 40

    // Alert score (0-30): deduct for unresolved critical alerts
    const criticalAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_resolved", (q) =>
        q.eq("societyId", args.societyId).eq("isResolved", false)
      )
      .filter((q) => q.eq(q.field("severity"), "critical"))
      .collect();
    const alertPenalty = Math.min(30, criticalAlerts.length * 10);
    const alertScore = 30 - alertPenalty;

    // Waste segregation score (0-30): compliance rate last 7 days
    const wasteLogs = await ctx.db
      .query("wasteLogs")
      .withIndex("by_logged_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("loggedAt", last7d)
      )
      .collect();
    const segregationRate =
      wasteLogs.length > 0
        ? wasteLogs.filter((l) => l.segregationOk).length / wasteLogs.length
        : 0.7;
    const wasteScore = Math.round(segregationRate * 30);

    const total = Math.min(100, waterScore + alertScore + wasteScore);
    const grade =
      total >= 85 ? "A" : total >= 70 ? "B" : total >= 50 ? "C" : "D";

    return {
      score: total,
      breakdown: { water: waterScore, alerts: alertScore, waste: wasteScore },
      grade,
    };
  },
});

export const deleteBlock = mutation({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block not found");
    await ctx.db.delete(args.blockId);
    const society = await ctx.db.get(block.societyId);
    if (society && (society.totalBlocks ?? 0) > 0) {
      await ctx.db.patch(block.societyId, {
        totalBlocks: (society.totalBlocks ?? 1) - 1,
      });
    }
  },
});
