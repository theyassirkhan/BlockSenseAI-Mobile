import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Helper: insert alert + schedule AI explanation ────────────────────────

async function insertAlertWithAI(
  ctx: any,
  data: {
    societyId: any;
    blockId: any;
    utility: any;
    alertType: any;
    severity: any;
    title: string;
    message: string;
    metadata?: any;
  }
) {
  const alertId = await ctx.db.insert("alerts", {
    ...data,
    isResolved: false,
    triggeredAt: Date.now(),
  });

  // Fetch society + block names for Claude context (best-effort)
  try {
    const society = await ctx.db.get(data.societyId);
    const block = await ctx.db.get(data.blockId);
    await ctx.scheduler.runAfter(0, internal.ai.explainAlert, {
      alertId,
      title: data.title,
      message: data.message,
      utility: data.utility,
      severity: data.severity,
      metadata: data.metadata,
      societyName: society?.name ?? "Unknown Society",
      blockName: block?.name ?? "Unknown Block",
    });
  } catch {
    // AI explanation is non-critical — don't fail the alert insertion
  }

  return alertId;
}

// ── Queries ───────────────────────────────────────────────────────────────

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
    if (!user) throw new Error("Profile not found");
    if (user.role !== "rwa" && user.role !== "admin" && user.role !== "platform_admin") {
      throw new Error("Forbidden: only RWA managers and admins can resolve alerts");
    }
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedBy: user._id,
      resolvedAt: Date.now(),
    });
  },
});

// ── Threshold checks (all use insertAlertWithAI) ──────────────────────────

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
          const alertId = await insertAlertWithAI(ctx, {
            societyId: args.societyId,
            blockId: args.blockId,
            utility: "water",
            alertType: "threshold",
            severity: tank.currentLevelPct < 10 ? "critical" : "warning",
            title: `${tank.name} critically low`,
            message: `${tank.name} is at ${tank.currentLevelPct}%. Order tanker immediately.`,
            metadata: { tankId: tank._id, level: tank.currentLevelPct },
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
          await insertAlertWithAI(ctx, {
            societyId: args.societyId,
            blockId: args.blockId,
            utility: "power",
            alertType: "threshold",
            severity: levelPct < 10 ? "critical" : "warning",
            title: `${dg.name} diesel low`,
            message: `${dg.name} diesel at ${Math.round(levelPct)}% (${Math.round(dg.dieselLevelLiters)}L). Refuel soon.`,
            metadata: { dgId: dg._id, levelPct: Math.round(levelPct) },
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
        await insertAlertWithAI(ctx, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "gas",
          alertType: "threshold",
          severity: "warning",
          title: "Low gas pressure detected",
          message: `Gas pressure is at ${latest.pressurePSI} PSI. Check supply line.`,
          metadata: { pressurePSI: latest.pressurePSI },
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
        await insertAlertWithAI(ctx, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "sewage",
          alertType: "threshold",
          severity: latest.sludgeTankPct > 90 ? "critical" : "warning",
          title: "STP sludge tank near full",
          message: `Sludge tank at ${latest.sludgeTankPct}%. Schedule desludging.`,
          metadata: { sludgeTankPct: latest.sludgeTankPct },
        });
      }
    }
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
      await insertAlertWithAI(ctx, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "garbage",
        alertType: "threshold",
        severity: "warning",
        title: "Garbage collection missed",
        message: `Scheduled collection was missed. Contact vendor.`,
        metadata: { logId: log._id },
      });
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

// ── Manual: retroactively explain existing alerts ─────────────────────────

export const explainExistingAlerts = mutation({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) => q.eq(q.field("isResolved"), false))
      .collect();

    const society = await ctx.db.get(args.societyId);
    const block = await ctx.db.get(args.blockId);

    let scheduled = 0;
    for (const alert of alerts) {
      if (!alert.aiExplanation) {
        await ctx.scheduler.runAfter(scheduled * 500, internal.ai.explainAlert, {
          alertId: alert._id,
          title: alert.title,
          message: alert.message,
          utility: alert.utility,
          severity: alert.severity,
          metadata: alert.metadata,
          societyName: society?.name ?? "Unknown",
          blockName: block?.name ?? "Unknown",
        });
        scheduled++;
      }
    }
    return { scheduled };
  },
});
