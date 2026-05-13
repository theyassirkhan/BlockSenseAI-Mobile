import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ── Shared helpers ────────────────────────────────────────────────────────────

function since(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ── Water ─────────────────────────────────────────────────────────────────────

export const getWaterContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const tanks = await ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .collect();

    const readings30d = await ctx.db
      .query("waterReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", since(30))
      )
      .order("desc")
      .collect();

    const consumption = readings30d.filter(r => r.readingType === "consumption");
    const totalKL = consumption.reduce((s, r) => s + r.value, 0);
    const avgDailyKL = consumption.length > 0 ? totalKL / 30 : 0;

    const tankerOrders = await ctx.db
      .query("tankerOrders")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .order("desc")
      .take(5);

    return {
      tanks: tanks.map(t => ({
        name: t.name,
        type: t.type,
        capacityKL: t.capacityKL,
        currentLevelPct: t.currentLevelPct,
        currentKL: Math.round(t.capacityKL * t.currentLevelPct / 100 * 10) / 10,
        lastUpdated: new Date(t.lastUpdated).toISOString(),
      })),
      last30Days: {
        totalConsumptionKL: Math.round(totalKL * 10) / 10,
        avgDailyKL: Math.round(avgDailyKL * 10) / 10,
        readingCount: readings30d.length,
      },
      recentTankerOrders: tankerOrders.map(o => ({
        quantityKL: o.quantityKL,
        status: o.status,
        scheduledAt: o.scheduledAt ? new Date(o.scheduledAt).toISOString() : null,
        cost: o.cost,
        triggeredBy: o.triggeredBy,
      })),
      tankerForecast: avgDailyKL > 0 ? {
        daysUntilCritical: Math.max(0, Math.round(
          tanks.reduce((s, t) => s + t.capacityKL * t.currentLevelPct / 100, 0) * 0.8 / avgDailyKL
        )),
      } : null,
    };
  },
});

// ── Power ─────────────────────────────────────────────────────────────────────

export const getPowerContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const readings30d = await ctx.db
      .query("powerReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", since(30))
      )
      .order("desc")
      .collect();

    const dgUnits = await ctx.db
      .query("dgUnits")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .collect();

    const outages30d = await ctx.db
      .query("powerOutages")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .filter((q) => q.gte(q.field("startedAt"), since(30)))
      .collect();

    const bySource: Record<string, number> = {};
    for (const r of readings30d) {
      bySource[r.source] = (bySource[r.source] ?? 0) + r.valueKWH;
    }

    return {
      last30Days: {
        totalKWH: Math.round(Object.values(bySource).reduce((a, b) => a + b, 0)),
        bySource,
        outageCount: outages30d.length,
        totalOutageHours: outages30d.reduce((s, o) => s + (o.durationHrs ?? 0), 0),
      },
      dgUnits: dgUnits.map(d => ({
        name: d.name,
        capacityKVA: d.capacityKVA,
        dieselLevelPct: Math.round(d.dieselLevelLiters / d.dieselCapacityLiters * 100),
        dieselLevelLiters: d.dieselLevelLiters,
        isRunning: d.isRunning,
        totalRuntimeHours: d.totalRuntimeHours,
        hoursRemaining: d.consumptionRateLPH > 0
          ? Math.round(d.dieselLevelLiters / d.consumptionRateLPH)
          : null,
        lastServiceDate: d.lastServiceDate ? new Date(d.lastServiceDate).toISOString() : null,
      })),
    };
  },
});

// ── Gas ───────────────────────────────────────────────────────────────────────

export const getGasContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const readings90d = await ctx.db
      .query("gasReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", since(90))
      )
      .order("desc")
      .collect();

    const latest = readings90d[0] ?? null;
    const last30 = readings90d.filter(r => r.recordedAt >= since(30));
    const prev30 = readings90d.filter(r => r.recordedAt < since(30) && r.recordedAt >= since(60));

    const totalSCM30 = last30.reduce((s, r) => s + (r.consumptionSCM ?? 0), 0);
    const totalSCMPrev = prev30.reduce((s, r) => s + (r.consumptionSCM ?? 0), 0);

    return {
      latest: latest ? {
        meterReading: latest.meterReading,
        pressurePSI: latest.pressurePSI,
        recordedAt: new Date(latest.recordedAt).toISOString(),
      } : null,
      last30Days: {
        totalConsumptionSCM: Math.round(totalSCM30 * 10) / 10,
        readingCount: last30.length,
        avgPressurePSI: last30.length > 0
          ? Math.round(last30.reduce((s, r) => s + r.pressurePSI, 0) / last30.length * 10) / 10
          : null,
      },
      trendVsPreviousMonth: totalSCMPrev > 0
        ? Math.round(((totalSCM30 - totalSCMPrev) / totalSCMPrev) * 100)
        : null,
      recentReadings: last30.slice(0, 10).map(r => ({
        consumptionSCM: r.consumptionSCM,
        pressurePSI: r.pressurePSI,
        recordedAt: new Date(r.recordedAt).toISOString(),
      })),
    };
  },
});

// ── Sewage ────────────────────────────────────────────────────────────────────

export const getSewageContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const readings30d = await ctx.db
      .query("sewageReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("recordedAt", since(30))
      )
      .order("desc")
      .collect();

    const latest = readings30d[0] ?? null;
    const faultCount = readings30d.filter(r => r.stpStatus === "fault").length;
    const maintenanceCount = readings30d.filter(r => r.stpStatus === "maintenance").length;

    return {
      latest: latest ? {
        stpStatus: latest.stpStatus,
        sludgeTankPct: latest.sludgeTankPct,
        treatedTankPct: latest.treatedTankPct,
        inflowRateLPH: latest.inflowRateLPH,
        recordedAt: new Date(latest.recordedAt).toISOString(),
      } : null,
      last30Days: {
        totalReadings: readings30d.length,
        faultEvents: faultCount,
        maintenanceEvents: maintenanceCount,
        avgSludgePct: readings30d.length > 0
          ? Math.round(readings30d.reduce((s, r) => s + r.sludgeTankPct, 0) / readings30d.length)
          : null,
      },
      statusBreakdown: {
        normal: readings30d.filter(r => r.stpStatus === "normal").length,
        maintenance: maintenanceCount,
        fault: faultCount,
        offline: readings30d.filter(r => r.stpStatus === "offline").length,
      },
    };
  },
});

// ── Waste ─────────────────────────────────────────────────────────────────────

export const getWasteContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const logs30d = await ctx.db
      .query("wasteLogs")
      .withIndex("by_logged_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("loggedAt", since(30))
      )
      .order("desc")
      .collect();

    const logs90d = await ctx.db
      .query("wasteLogs")
      .withIndex("by_logged_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId).gte("loggedAt", since(90))
      )
      .collect();

    const totalWet30 = logs30d.reduce((s, l) => s + l.wetWasteKG, 0);
    const totalDry30 = logs30d.reduce((s, l) => s + l.dryWasteKG, 0);
    const segregationRate = logs30d.length > 0
      ? Math.round(logs30d.filter(l => l.segregationOk).length / logs30d.length * 100)
      : null;

    const monthlyTotals: Record<string, { wet: number; dry: number }> = {};
    for (const l of logs90d) {
      const month = new Date(l.loggedAt).toISOString().slice(0, 7);
      if (!monthlyTotals[month]) monthlyTotals[month] = { wet: 0, dry: 0 };
      monthlyTotals[month].wet += l.wetWasteKG;
      monthlyTotals[month].dry += l.dryWasteKG;
    }

    return {
      last30Days: {
        totalWetKG: Math.round(totalWet30),
        totalDryKG: Math.round(totalDry30),
        totalKG: Math.round(totalWet30 + totalDry30),
        logCount: logs30d.length,
        segregationRate,
      },
      monthlyTrend: Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, ...v })),
    };
  },
});

// ── Garbage ───────────────────────────────────────────────────────────────────

export const getGarbageContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const logs30d = await ctx.db
      .query("garbageCollectionLog")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .filter((q) => q.gte(q.field("scheduledAt"), since(30)))
      .order("desc")
      .collect();

    const missed = logs30d.filter(l => l.status === "missed");
    const collected = logs30d.filter(l => l.status === "collected");

    const vendorIds = Array.from(new Set(logs30d.map(l => l.vendorId)));
    const vendors = await Promise.all(vendorIds.map(id => ctx.db.get(id)));

    const vendorPerf: Record<string, { total: number; collected: number; name: string }> = {};
    for (const l of logs30d) {
      const vendor = vendors.find(vd => vd?._id === l.vendorId);
      const key = l.vendorId as string;
      if (!vendorPerf[key]) vendorPerf[key] = { total: 0, collected: 0, name: (vendor as { name?: string } | null)?.name ?? "Unknown" };
      vendorPerf[key].total++;
      if (l.status === "collected") vendorPerf[key].collected++;
    }

    return {
      last30Days: {
        totalScheduled: logs30d.length,
        collected: collected.length,
        missed: missed.length,
        onTimeRate: logs30d.length > 0
          ? Math.round(collected.length / logs30d.length * 100)
          : null,
      },
      recentMissed: missed.slice(0, 5).map(l => ({
        scheduledAt: new Date(l.scheduledAt).toISOString(),
        notes: l.notes,
      })),
      vendorPerformance: Object.values(vendorPerf).map(v => ({
        name: v.name,
        onTimeRate: v.total > 0 ? Math.round(v.collected / v.total * 100) : 0,
        totalJobs: v.total,
      })),
    };
  },
});

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlertsContext = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const activeAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_resolved", (q) => q.eq("societyId", args.societyId).eq("isResolved", false))
      .order("desc")
      .take(20);

    const anomalies = await ctx.db
      .query("anomalyRecords")
      .withIndex("by_status", (q) =>
        q.eq("societyId", args.societyId).eq("status", "open").gte("detectedAt", since(7))
      )
      .order("desc")
      .take(20);

    return {
      activeAlerts: activeAlerts.map(a => ({
        id: a._id,
        utility: a.utility,
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
        aiExplanation: a.aiExplanation,
        triggeredAt: new Date(a.triggeredAt).toISOString(),
      })),
      recentAnomalies: anomalies.map(a => ({
        id: a._id,
        utility: a.utility,
        anomalyType: a.anomalyType,
        severity: a.severity,
        score: a.score,
        source: a.source,
        description: a.description,
        detectedAt: new Date(a.detectedAt).toISOString(),
      })),
      summary: {
        totalActive: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === "critical").length,
        warning: activeAlerts.filter(a => a.severity === "warning").length,
        openAnomalies: anomalies.length,
      },
    };
  },
});

// ── Payments / Funds ──────────────────────────────────────────────────────────

export const getPaymentsContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(200);

    const pending = allPayments.filter(p => p.status === "pending" || p.status === "overdue");
    const paidThisMonth = allPayments.filter(
      p => p.status === "confirmed" && p.paidAt && p.paidAt >= currentMonth.getTime()
    );

    const totalPending = pending.reduce((s, p) => s + p.amount, 0);
    const totalCollectedThisMonth = paidThisMonth.reduce((s, p) => s + p.amount, 0);

    return {
      totalPendingAmount: totalPending,
      pendingCount: pending.length,
      overdueCount: allPayments.filter(p => p.status === "overdue").length,
      collectedThisMonth: totalCollectedThisMonth,
      collectionCount: paidThisMonth.length,
      recentPending: pending.slice(0, 5).map(p => ({
        description: p.description,
        amount: p.amount,
        dueDate: new Date(p.dueDate).toISOString(),
        status: p.status,
      })),
    };
  },
});

// ── Vendors ───────────────────────────────────────────────────────────────────

export const getVendorsContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    return vendors
      .filter(v => v.isActive !== false)
      .map(v => ({
        id: v._id,
        name: v.name,
        type: v.type,
        phone: v.phone,
        ratePerUnit: v.ratePerUnit,
        unit: v.unit,
        isPreferred: v.isPreferred,
        rating: v.rating,
        totalJobs: v.totalJobs,
      }));
  },
});

// ── Staff ─────────────────────────────────────────────────────────────────────

export const getStaffContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const staffList = await ctx.db
      .query("staff")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) =>
        q.eq("societyId", args.societyId).gte("date", todayStart.getTime())
      )
      .collect();

    const onDuty = staffList.filter(s => s.isOnDuty);
    const absent = shifts.filter(s => s.status === "absent" || s.status === "leave");

    return {
      total: staffList.length,
      onDuty: onDuty.length,
      absentToday: absent.length,
      staffList: staffList.map(s => ({
        name: s.name,
        role: s.role,
        shift: s.shift,
        isOnDuty: s.isOnDuty,
        lastAttendance: s.lastAttendanceAt
          ? new Date(s.lastAttendanceAt).toISOString()
          : null,
      })),
    };
  },
});

// ── Notices ───────────────────────────────────────────────────────────────────

export const getNoticesContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const notices = await ctx.db
      .query("notices")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(10);

    const now = Date.now();
    return notices
      .filter(n => !n.expiresAt || n.expiresAt > now)
      .map(n => ({
        id: n._id,
        title: n.title,
        type: n.type,
        isPinned: n.isPinned,
        createdAt: new Date(n.createdAt).toISOString(),
      }));
  },
});

// ── Complaints ────────────────────────────────────────────────────────────────

export const getComplaintsContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("complaints")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(50);

    const open = all.filter(c => c.status === "open" || c.status === "under_review");
    const escalated = all.filter(c => c.status === "escalated");

    const categoryCount: Record<string, number> = {};
    for (const c of all) {
      categoryCount[c.category] = (categoryCount[c.category] ?? 0) + 1;
    }

    return {
      openCount: open.length,
      escalatedCount: escalated.length,
      categoryBreakdown: categoryCount,
      recent: open.slice(0, 5).map(c => ({
        id: c._id,
        subject: c.subject,
        category: c.category,
        severity: c.severity,
        status: c.status,
        createdAt: new Date(c.createdAt).toISOString(),
      })),
    };
  },
});

// ── Service Requests ──────────────────────────────────────────────────────────

export const getServiceRequestsContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const open = await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("societyId", args.societyId).eq("status", "open"))
      .order("desc")
      .take(20);

    const inProgress = await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("societyId", args.societyId).eq("status", "in_progress"))
      .order("desc")
      .take(20);

    return {
      openCount: open.length,
      inProgressCount: inProgress.length,
      urgent: [...open, ...inProgress].filter(r => r.priority === "urgent").length,
      recent: open.slice(0, 5).map(r => ({
        category: r.category,
        description: r.description.slice(0, 100),
        priority: r.priority,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
    };
  },
});

// ── Society info ──────────────────────────────────────────────────────────────

export const getSocietyContext = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const society = await ctx.db.get(args.societyId);
    if (!society) throw new Error("Society not found");

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    const residents = await ctx.db
      .query("users")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .filter((q) => q.eq(q.field("role"), "resident"))
      .collect();

    return {
      name: society.name,
      city: society.city,
      totalFlats: society.totalFlats,
      subscriptionPlan: society.subscriptionPlan,
      blocks: blocks.map(b => ({ name: b.name, type: b.type, totalFlats: b.totalFlats })),
      residentCount: residents.length,
    };
  },
});

// ── Full context bundle (used to build agent system prompt) ───────────────────

export const getAgentContextBundle = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const [society, alerts, payments] = await Promise.all([
      ctx.db.get(args.societyId),
      ctx.db.query("alerts")
        .withIndex("by_resolved", (q) => q.eq("societyId", args.societyId).eq("isResolved", false))
        .take(5),
      ctx.db.query("payments")
        .withIndex("by_status", (q) => q.eq("societyId", args.societyId).eq("status", "overdue"))
        .take(3),
    ]);

    const tanks = await ctx.db
      .query("waterTanks")
      .withIndex("by_block", (q) => q.eq("societyId", args.societyId).eq("blockId", args.blockId))
      .collect();

    return {
      societyName: society?.name ?? "Unknown Society",
      city: society?.city ?? "",
      totalFlats: society?.totalFlats ?? 0,
      subscriptionPlan: society?.subscriptionPlan ?? "basic",
      activeAlertCount: alerts.length,
      criticalAlertCount: alerts.filter(a => a.severity === "critical").length,
      overduePaymentCount: payments.length,
      waterTankSummary: tanks.map(t => `${t.name}: ${t.currentLevelPct}%`).join(", "),
    };
  },
});
