import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnomalyInput = {
  societyId: Id<"societies">;
  blockId: Id<"blocks">;
  utility: "water" | "power" | "gas" | "sewage" | "waste" | "garbage";
  entityType: string;
  entityId?: string;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  description: string;
  metadata?: Record<string, unknown>;
};

// ── Statistical helpers ───────────────────────────────────────────────────────

function rollingStats(values: number[]) {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function zScore(value: number, mean: number, std: number) {
  if (std === 0) return 0;
  return Math.abs((value - mean) / std);
}

function zToSeverity(z: number): "low" | "medium" | "high" | "critical" {
  if (z > 3.5) return "critical";
  if (z > 2.5) return "high";
  if (z > 1.8) return "medium";
  return "low";
}

// ── Insert anomaly record ─────────────────────────────────────────────────────

export const insertAnomaly = internalMutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    utility: v.union(
      v.literal("water"), v.literal("power"), v.literal("gas"),
      v.literal("sewage"), v.literal("waste"), v.literal("garbage")
    ),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    anomalyType: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    score: v.number(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("anomalyRecords")
      .withIndex("by_society_utility", (q) =>
        q.eq("societyId", args.societyId).eq("utility", args.utility)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("anomalyType"), args.anomalyType),
          q.eq(q.field("status"), "open"),
          q.gte(q.field("detectedAt"), Date.now() - 6 * 60 * 60 * 1000)
        )
      )
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("anomalyRecords", {
      ...args,
      source: "heuristic" as const,
      status: "open" as const,
      detectedAt: Date.now(),
    });
  },
});

// ── Acknowledge / resolve ─────────────────────────────────────────────────────

export const acknowledgeAnomaly = internalMutation({
  args: {
    anomalyId: v.id("anomalyRecords"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.anomalyId, {
      status: "acknowledged",
      acknowledgedBy: args.userId,
    });
  },
});

// Public mutation for UI
export const acknowledgeAnomalyByUser = internalMutation({
  args: { anomalyId: v.id("anomalyRecords") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.anomalyId, { status: "acknowledged" });
  },
});

export const resolveAnomaly = internalMutation({
  args: { anomalyId: v.id("anomalyRecords") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.anomalyId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
  },
});

// ── Read queries ──────────────────────────────────────────────────────────────

export const getOpenAnomalies = query({
  args: { societyId: v.id("societies"), blockId: v.optional(v.id("blocks")) },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("anomalyRecords")
      .withIndex("by_status", (q) =>
        q.eq("societyId", args.societyId).eq("status", "open").gte("detectedAt", Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .order("desc")
      .take(50);

    if (args.blockId) return all.filter(a => a.blockId === args.blockId);
    return all;
  },
});

// ── Water anomaly detection ───────────────────────────────────────────────────

export const runWaterAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const readings = await ctx.runQuery(internal.anomalyEngine._getWaterReadings, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since30,
    });

    const tanks = await ctx.runQuery(internal.anomalyEngine._getWaterTanks, {
      societyId: args.societyId,
      blockId: args.blockId,
    });

    const consumption = readings.filter(r => r.readingType === "consumption");
    if (consumption.length < 5) return;

    const recent = consumption.filter(r => r.recordedAt >= since7);
    const baseline = consumption.filter(r => r.recordedAt < since7);

    if (baseline.length < 3) return;

    const baselineStats = rollingStats(baseline.map(r => r.value));

    for (const r of recent) {
      const z = zScore(r.value, baselineStats.mean, baselineStats.std);
      if (z > 1.8) {
        const isSpike = r.value > baselineStats.mean;
        await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "water",
          entityType: "consumption_reading",
          anomalyType: isSpike ? "consumption_spike" : "consumption_drop",
          severity: zToSeverity(z),
          score: Math.min(1, z / 4),
          description: isSpike
            ? `Water consumption spike detected: ${r.value.toFixed(1)} KL vs baseline ${baselineStats.mean.toFixed(1)} KL (z=${z.toFixed(1)})`
            : `Unusually low water consumption: ${r.value.toFixed(1)} KL vs baseline ${baselineStats.mean.toFixed(1)} KL`,
          metadata: { value: r.value, baseline: baselineStats.mean, zScore: z },
        });
      }
    }

    for (const tank of tanks) {
      if (tank.currentLevelPct <= 15) {
        await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "water",
          entityType: "tank",
          entityId: tank._id,
          anomalyType: "tank_critical_low",
          severity: tank.currentLevelPct <= 5 ? "critical" : "high",
          score: 1 - tank.currentLevelPct / 20,
          description: `${tank.name} tank critically low: ${tank.currentLevelPct}%`,
          metadata: { tankName: tank.name, levelPct: tank.currentLevelPct },
        });
      }
    }
  },
});

export const _getWaterReadings = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("waterReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", args.since)
      )
      .collect(),
});

export const _getWaterTanks = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) =>
    ctx.db.query("waterTanks")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .collect(),
});

// ── Power anomaly detection ───────────────────────────────────────────────────

export const runPowerAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const readings = await ctx.runQuery(internal.anomalyEngine._getPowerReadings, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since30,
    });

    const consumption = readings.filter(r => r.readingType === "consumption");
    if (consumption.length < 5) return;

    const recent = consumption.filter(r => r.recordedAt >= since7);
    const baseline = consumption.filter(r => r.recordedAt < since7);
    if (baseline.length < 3) return;

    const baselineStats = rollingStats(baseline.map(r => r.valueKWH));

    for (const r of recent) {
      const z = zScore(r.valueKWH, baselineStats.mean, baselineStats.std);
      if (z > 1.8) {
        await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "power",
          entityType: "consumption_reading",
          anomalyType: r.valueKWH > baselineStats.mean ? "power_spike" : "power_drop",
          severity: zToSeverity(z),
          score: Math.min(1, z / 4),
          description: `Power consumption anomaly: ${r.valueKWH.toFixed(1)} kWh vs baseline ${baselineStats.mean.toFixed(1)} kWh`,
          metadata: { valueKWH: r.valueKWH, baseline: baselineStats.mean, zScore: z, source: r.source },
        });
      }
    }

    const dgUnits = await ctx.runQuery(internal.anomalyEngine._getDgUnits, {
      societyId: args.societyId,
      blockId: args.blockId,
    });

    for (const dg of dgUnits) {
      if (dg.dieselLevelLiters / dg.dieselCapacityLiters <= 0.15) {
        await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "power",
          entityType: "dg_unit",
          entityId: dg._id,
          anomalyType: "diesel_low",
          severity: dg.dieselLevelLiters / dg.dieselCapacityLiters <= 0.05 ? "critical" : "high",
          score: 1 - dg.dieselLevelLiters / dg.dieselCapacityLiters,
          description: `${dg.name} diesel level low: ${dg.dieselLevelLiters.toFixed(0)}L / ${dg.dieselCapacityLiters}L`,
          metadata: { dgName: dg.name, levelLiters: dg.dieselLevelLiters },
        });
      }
    }
  },
});

export const _getPowerReadings = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("powerReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", args.since)
      )
      .collect(),
});

export const _getDgUnits = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) =>
    ctx.db.query("dgUnits")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .collect(),
});

// ── Gas anomaly detection (heuristic) ────────────────────────────────────────

export const runGasAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since60 = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const readings = await ctx.runQuery(internal.anomalyEngine._getGasReadings, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since60,
    });

    if (readings.length < 3) return;

    const latest = readings[0];
    if (!latest) return;

    const prevReadings = readings.slice(1, 30);
    const consumptions = prevReadings
      .map(r => r.consumptionSCM ?? 0)
      .filter(v => v > 0);

    if (consumptions.length >= 3) {
      const stats = rollingStats(consumptions);
      const latestConsumption = latest.consumptionSCM ?? 0;
      if (latestConsumption > 0) {
        const z = zScore(latestConsumption, stats.mean, stats.std);
        if (z > 2) {
          await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
            societyId: args.societyId,
            blockId: args.blockId,
            utility: "gas",
            entityType: "meter",
            anomalyType: "gas_consumption_anomaly",
            severity: z > 3 ? "high" : "medium",
            score: Math.min(1, z / 4),
            description: `Gas consumption spike: ${latestConsumption.toFixed(1)} SCM vs baseline ${stats.mean.toFixed(1)} SCM`,
            metadata: { consumptionSCM: latestConsumption, baseline: stats.mean },
          });
        }
      }
    }

    if (latest.pressurePSI < 2) {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "gas",
        entityType: "pressure",
        anomalyType: "low_gas_pressure",
        severity: latest.pressurePSI < 0.5 ? "critical" : "high",
        score: Math.max(0, 1 - latest.pressurePSI / 2),
        description: `Low gas pressure detected: ${latest.pressurePSI} PSI`,
        metadata: { pressurePSI: latest.pressurePSI },
      });
    }
  },
});

export const _getGasReadings = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("gasReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", args.since)
      )
      .order("desc")
      .collect(),
});

// ── Sewage anomaly detection (heuristic) ─────────────────────────────────────

export const runSewageAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const readings = await ctx.runQuery(internal.anomalyEngine._getSewageReadings, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since30,
    });

    if (readings.length === 0) return;

    const latest = readings[0];
    if (!latest) return;

    if (latest.stpStatus === "fault") {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "sewage",
        entityType: "stp",
        anomalyType: "stp_fault",
        severity: "critical",
        score: 1,
        description: "STP unit reported fault status — immediate inspection required",
        metadata: { stpStatus: latest.stpStatus, sludgeTankPct: latest.sludgeTankPct },
      });
    }

    if (latest.sludgeTankPct >= 85) {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "sewage",
        entityType: "stp",
        anomalyType: "sludge_tank_high",
        severity: latest.sludgeTankPct >= 95 ? "critical" : "high",
        score: latest.sludgeTankPct / 100,
        description: `Sludge tank level critical: ${latest.sludgeTankPct}% — schedule desludging`,
        metadata: { sludgeTankPct: latest.sludgeTankPct },
      });
    }

    const faults = readings.filter(r => r.stpStatus === "fault");
    if (faults.length >= 3) {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "sewage",
        entityType: "stp",
        anomalyType: "recurring_stp_faults",
        severity: "high",
        score: Math.min(1, faults.length / 5),
        description: `${faults.length} STP fault events in the last 30 days — possible structural issue`,
        metadata: { faultCount: faults.length },
      });
    }
  },
});

export const _getSewageReadings = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("sewageReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", args.since)
      )
      .order("desc")
      .collect(),
});

// ── Waste anomaly detection (heuristic) ──────────────────────────────────────

export const runWasteAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const logs = await ctx.runQuery(internal.anomalyEngine._getWasteLogs, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since30,
    });

    if (logs.length < 5) return;

    const recent = logs.slice(0, 7);
    const baseline = logs.slice(7, 30);

    const baselineWet = rollingStats(baseline.map(l => l.wetWasteKG));
    const baselineDry = rollingStats(baseline.map(l => l.dryWasteKG));

    for (const log of recent) {
      const zWet = zScore(log.wetWasteKG, baselineWet.mean, baselineWet.std);
      const zDry = zScore(log.dryWasteKG, baselineDry.mean, baselineDry.std);
      const maxZ = Math.max(zWet, zDry);

      if (maxZ > 2) {
        await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
          societyId: args.societyId,
          blockId: args.blockId,
          utility: "waste",
          entityType: "waste_log",
          anomalyType: "waste_volume_spike",
          severity: zToSeverity(maxZ),
          score: Math.min(1, maxZ / 4),
          description: `Unusual waste volume: wet=${log.wetWasteKG}kg, dry=${log.dryWasteKG}kg (vs baseline wet=${baselineWet.mean.toFixed(1)}kg, dry=${baselineDry.mean.toFixed(1)}kg)`,
          metadata: { wetKG: log.wetWasteKG, dryKG: log.dryWasteKG, zScore: maxZ },
        });
      }
    }

    const poorSegregation = recent.filter(l => !l.segregationOk);
    if (poorSegregation.length >= 3) {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "waste",
        entityType: "segregation",
        anomalyType: "poor_segregation_pattern",
        severity: "medium",
        score: poorSegregation.length / recent.length,
        description: `Poor waste segregation: ${poorSegregation.length} of last ${recent.length} logs non-compliant`,
        metadata: { failCount: poorSegregation.length, total: recent.length },
      });
    }
  },
});

export const _getWasteLogs = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("wasteLogs")
      .withIndex("by_logged_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("loggedAt", args.since)
      )
      .order("desc")
      .collect(),
});

// ── Garbage anomaly detection (heuristic) ────────────────────────────────────

export const runGarbageAnomalyCheck = internalAction({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const since14 = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const logs = await ctx.runQuery(internal.anomalyEngine._getGarbageLogs, {
      societyId: args.societyId,
      blockId: args.blockId,
      since: since14,
    });

    const missed = logs.filter(l => l.status === "missed");
    const total = logs.length;

    if (missed.length >= 2) {
      await ctx.runMutation(internal.anomalyEngine.insertAnomaly, {
        societyId: args.societyId,
        blockId: args.blockId,
        utility: "garbage",
        entityType: "collection",
        anomalyType: "missed_pickups",
        severity: missed.length >= 4 ? "high" : "medium",
        score: Math.min(1, missed.length / 5),
        description: `${missed.length} missed garbage pickups in the last 14 days out of ${total} scheduled`,
        metadata: { missed: missed.length, total },
      });
    }
  },
});

export const _getGarbageLogs = internalQuery({
  args: { societyId: v.id("societies"), blockId: v.id("blocks"), since: v.number() },
  handler: async (ctx, args) =>
    ctx.db.query("garbageCollectionLog")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .filter((q) => q.gte(q.field("scheduledAt"), args.since))
      .collect(),
});

// ── Batch run: all societies, all utilities ───────────────────────────────────

export const _getAllSocietiesBlocks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const societies = await ctx.db.query("societies").collect();
    const result: Array<{ societyId: Id<"societies">; blockId: Id<"blocks"> }> = [];
    for (const society of societies) {
      const blocks = await ctx.db
        .query("blocks")
        .withIndex("by_society", (q) => q.eq("societyId", society._id))
        .collect();
      for (const block of blocks) {
        result.push({ societyId: society._id, blockId: block._id });
      }
    }
    return result;
  },
});

export const runAllAnomalyChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const pairs = await ctx.runQuery(internal.anomalyEngine._getAllSocietiesBlocks, {});

    for (const { societyId, blockId } of pairs) {
      await ctx.runAction(internal.anomalyEngine.runWaterAnomalyCheck, { societyId, blockId });
      await ctx.runAction(internal.anomalyEngine.runPowerAnomalyCheck, { societyId, blockId });
      await ctx.runAction(internal.anomalyEngine.runGasAnomalyCheck, { societyId, blockId });
      await ctx.runAction(internal.anomalyEngine.runSewageAnomalyCheck, { societyId, blockId });
      await ctx.runAction(internal.anomalyEngine.runWasteAnomalyCheck, { societyId, blockId });
      await ctx.runAction(internal.anomalyEngine.runGarbageAnomalyCheck, { societyId, blockId });
    }
  },
});
