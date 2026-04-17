import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getActiveAlerts = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("alerts")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) => q.eq(q.field("isResolved"), false))
      .order("desc")
      .collect();
  },
});

export const getAllAlerts = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const all = await ctx.db
      .query("alerts")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .take(50);
    if (args.includeResolved) return all;
    return all.filter((a) => !a.isResolved);
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedBy: user?._id,
      resolvedAt: Date.now(),
    });
  },
});

export const checkWaterThresholds = internalMutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const tanks = await ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();

    for (const tank of tanks) {
      if (tank.currentLevelPct < 20) {
        const existing = await ctx.db
          .query("alerts")
          .withIndex("by_block", (q) =>
            q.eq("societyId", args.societyId).eq("blockId", args.blockId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("isResolved"), false),
              q.eq(q.field("utility"), "water"),
              q.eq(q.field("alertType"), "threshold")
            )
          )
          .first();
        if (!existing) {
          const alertId = await ctx.db.insert("alerts", {
            societyId: args.societyId,
            blockId: args.blockId,
            utility: "water",
            alertType: "threshold",
            severity: tank.currentLevelPct < 10 ? "critical" : "warning",
            title: `${tank.name} critically low`,
            message: `${tank.name} is at ${tank.currentLevelPct}%. Order tanker immediately.`,
            metadata: { tankId: tank._id, level: tank.currentLevelPct },
            isResolved: false,
            triggeredAt: Date.now(),
          });
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.notifyCommittee,
            {
              societyId: args.societyId,
              blockId: args.blockId,
              templateId: "tank_critical",
              variables: {
                name: tank.name,
                level: String(tank.currentLevelPct),
              },
            }
          );
        }
      }
    }
  },
});

export const checkPowerThresholds = internalMutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const dgUnits = await ctx.db
      .query("dgUnits")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .collect();

    for (const dg of dgUnits) {
      const levelPct = (dg.dieselLevelLiters / dg.dieselCapacityLiters) * 100;
      if (levelPct < 20) {
        const existing = await ctx.db
          .query("alerts")
          .withIndex("by_block", (q) =>
            q.eq("societyId", args.societyId).eq("blockId", args.blockId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("isResolved"), false),
              q.eq(q.field("utility"), "power"),
              q.eq(q.field("alertType"), "threshold")
            )
          )
          .first();
        if (!existing) {
          await ctx.db.insert("alerts", {
            societyId: args.societyId,
            blockId: args.blockId,
            utility: "power",
            alertType: "threshold",
            severity: levelPct < 10 ? "critical" : "warning",
            title: `${dg.name} diesel low`,
            message: `${dg.name} diesel at ${Math.round(levelPct)}% (${Math.round(dg.dieselLevelLiters)}L). Refuel soon.`,
            metadata: { dgId: dg._id, levelPct: Math.round(levelPct) },
            isResolved: false,
            triggeredAt: Date.now(),
          });
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.notifyCommittee,
            {
              societyId: args.societyId,
              blockId: args.blockId,
              templateId: "diesel_low",
              variables: {
                name: dg.name,
                level: String(Math.round(levelPct)),
              },
            }
          );
        }
      }
    }
  },
});

export const checkGasThresholds = internalMutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("gasReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .first();
    if (latest && latest.pressurePSI < 5) {
      const existing = await ctx.db
        .query("alerts")
        .withIndex("by_block", (q) =>
          q.eq("societyId", args.societyId).eq("blockId", args.blockId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("isResolved"), false),
            q.eq(q.field("utility"), "gas")
          )
        )
        .first();
      if (!existing) {
        await ctx.db.insert("alerts", {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "gas",
          alertType: "threshold",
          severity: "warning",
          title: "Low gas pressure detected",
          message: `Gas pressure is at ${latest.pressurePSI} PSI. Check supply line.`,
          metadata: { pressurePSI: latest.pressurePSI },
          isResolved: false,
          triggeredAt: Date.now(),
        });
      }
    }
  },
});

export const checkSewageThresholds = internalMutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("sewageReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .first();
    if (latest && latest.sludgeTankPct > 80) {
      const existing = await ctx.db
        .query("alerts")
        .withIndex("by_block", (q) =>
          q.eq("societyId", args.societyId).eq("blockId", args.blockId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("isResolved"), false),
            q.eq(q.field("utility"), "sewage")
          )
        )
        .first();
      if (!existing) {
        await ctx.db.insert("alerts", {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "sewage",
          alertType: "threshold",
          severity: latest.sludgeTankPct > 90 ? "critical" : "warning",
          title: "STP sludge tank near full",
          message: `Sludge tank at ${latest.sludgeTankPct}%. Schedule desludging.`,
          metadata: { sludgeTankPct: latest.sludgeTankPct },
          isResolved: false,
          triggeredAt: Date.now(),
        });
      }
    }
  },
});

export const getWeeklyAlertSummary = internalQuery({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) => q.gte(q.field("triggeredAt"), args.since))
      .collect();
    const critical = alerts.filter((a) => a.severity === "critical").length;
    return { total: alerts.length, critical };
  },
});

export const checkGarbageThresholds = internalMutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const overdue = await ctx.db
      .query("garbageCollectionLog")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("scheduledAt"), Date.now())
        )
      )
      .collect();

    for (const log of overdue) {
      await ctx.db.patch(log._id, { status: "missed" });
      await ctx.db.insert("alerts", {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "garbage",
        alertType: "threshold",
        severity: "warning",
        title: "Garbage collection missed",
        message: `Scheduled collection was missed. Contact vendor.`,
        metadata: { logId: log._id },
        isResolved: false,
        triggeredAt: Date.now(),
      });
    }
  },
});
