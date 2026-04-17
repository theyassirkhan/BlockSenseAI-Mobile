import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEMO_SOCIETY_NAME = "Green Valley Society";
const DEMO_BLOCK_NAME = "Block A";

// Creates demo society + block if needed, then sets current user's profile
export const setupDemoUser = mutation({
  args: {
    role: v.union(v.literal("admin"), v.literal("rwa"), v.literal("resident")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    // Find or create demo society
    let society = await ctx.db
      .query("societies")
      .filter((q) => q.eq(q.field("name"), DEMO_SOCIETY_NAME))
      .first();

    if (!society) {
      const societyId = await ctx.db.insert("societies", {
        name: DEMO_SOCIETY_NAME,
        address: "123 Demo Lane, Bangalore",
        city: "Bangalore",
        totalFlats: 120,
        totalBlocks: 3,
        subscriptionPlan: "pro",
        createdAt: Date.now(),
      });
      society = await ctx.db.get(societyId);
    }

    // Find or create demo block
    let block = await ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", society!._id))
      .first();

    if (!block) {
      const blockId = await ctx.db.insert("blocks", {
        societyId: society!._id,
        name: DEMO_BLOCK_NAME,
        type: "block",
        totalFlats: 40,
        createdAt: Date.now(),
      });
      block = await ctx.db.get(blockId);

      // Seed a water tank
      await ctx.db.insert("waterTanks", {
        societyId: society!._id,
        blockId: block!._id,
        name: "Overhead Tank 1",
        type: "overhead",
        capacityKL: 50,
        currentLevelPct: 68,
        lastUpdated: Date.now(),
      });
    }

    // Upsert current user profile — use authId as tokenIdentifier (matches getMyProfile)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();

    const roleNames = { admin: "Demo Admin", rwa: "Demo RWA Manager", resident: "Demo Resident" };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: roleNames[args.role],
        role: args.role,
        societyId: society!._id,
        blockId: block!._id,
        defaultBlockId: block!._id,
        isActive: true,
      });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier: authId as string,
        name: roleNames[args.role],
        role: args.role,
        societyId: society!._id,
        blockId: block!._id,
        defaultBlockId: block!._id,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return { societyId: society!._id, blockId: block!._id };
  },
});

// Seeds 90 days of realistic historical data for all 6 utilities.
// Safe to call multiple times — idempotent (skips if water readings already exist).
export const seedAllDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    const society = await ctx.db
      .query("societies")
      .filter((q) => q.eq(q.field("name"), DEMO_SOCIETY_NAME))
      .first();
    if (!society) throw new Error("Run setupDemoUser first.");

    const block = await ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .first();
    if (!block) throw new Error("Demo block not found.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found.");

    // Idempotency guard
    const existingWater = await ctx.db
      .query("waterReadings")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .first();
    if (existingWater) return { skipped: true, reason: "Already seeded" };

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // --- Vendors ---
    const waterVendorId = await ctx.db.insert("vendors", {
      societyId: society._id,
      name: "AquaFresh Tankers",
      type: "water_tanker",
      phone: "+919876543210",
      whatsapp: "+919876543210",
      ratePerUnit: 1200,
      unit: "KL",
      isPreferred: true,
      rating: 4,
    });

    const dieselVendorId = await ctx.db.insert("vendors", {
      societyId: society._id,
      name: "PowerFuel Suppliers",
      type: "diesel",
      phone: "+919876543211",
      ratePerUnit: 92,
      unit: "L",
      isPreferred: true,
      rating: 5,
    });

    const garbageVendorId = await ctx.db.insert("vendors", {
      societyId: society._id,
      name: "CleanCity Waste Mgmt",
      type: "garbage",
      phone: "+919876543212",
      isPreferred: true,
      rating: 4,
    });

    // --- DG Unit ---
    const dgUnitId = await ctx.db.insert("dgUnits", {
      societyId: society._id,
      blockId: block._id,
      name: "DG Set 1 – 125 KVA",
      capacityKVA: 125,
      dieselCapacityLiters: 200,
      dieselLevelLiters: 145,
      isRunning: false,
      totalRuntimeHours: 342,
      consumptionRateLPH: 22,
      lastServiceDate: now - 45 * DAY,
      lastUpdated: now - DAY,
    });

    // --- Staff ---
    await Promise.all([
      ctx.db.insert("staff", {
        societyId: society._id,
        name: "Ramesh Kumar",
        role: "Security Guard",
        phone: "+919876543213",
        shift: "morning",
        isOnDuty: true,
        lastAttendanceAt: now - 3600000,
        createdAt: now - 60 * DAY,
      }),
      ctx.db.insert("staff", {
        societyId: society._id,
        name: "Suresh Nair",
        role: "Housekeeping",
        phone: "+919876543214",
        shift: "morning",
        isOnDuty: true,
        lastAttendanceAt: now - 7200000,
        createdAt: now - 60 * DAY,
      }),
      ctx.db.insert("staff", {
        societyId: society._id,
        name: "Priya Devi",
        role: "STP Operator",
        phone: "+919876543215",
        shift: "full_day",
        isOnDuty: false,
        lastAttendanceAt: now - 26 * 3600000,
        createdAt: now - 60 * DAY,
      }),
    ]);

    // --- Historical readings (90 days) using deterministic patterns ---
    const waterInserts: Promise<any>[] = [];
    const powerInserts: Promise<any>[] = [];
    const sewageInserts: Promise<any>[] = [];
    const wasteInserts: Promise<any>[] = [];
    const gasInserts: Promise<any>[] = [];
    const garbageInserts: Promise<any>[] = [];
    const outageInserts: Promise<any>[] = [];
    const tankerInserts: Promise<any>[] = [];

    for (let d = 90; d >= 1; d--) {
      const t = now - d * DAY;
      // Deterministic variation: mix of sin patterns keyed on d
      const sA = Math.sin(d * 0.37) * 0.5 + 0.5; // 0..1
      const sB = Math.sin(d * 0.71 + 1) * 0.5 + 0.5;
      const sC = Math.sin(d * 0.19 + 2) * 0.5 + 0.5;

      // Water: 8–14 KL/day
      waterInserts.push(
        ctx.db.insert("waterReadings", {
          societyId: society._id,
          blockId: block._id,
          source: "cauvery",
          readingType: "consumption",
          value: Math.round((8 + sA * 6) * 10) / 10,
          unit: "kl",
          recordedBy: user._id,
          recordedAt: t + 8 * 3600000,
        })
      );

      // Power: 190–270 kWh/day (grid)
      powerInserts.push(
        ctx.db.insert("powerReadings", {
          societyId: society._id,
          blockId: block._id,
          source: "grid",
          readingType: "consumption",
          valueKWH: Math.round(190 + sB * 80),
          recordedBy: user._id,
          recordedAt: t + 8 * 3600000,
        })
      );

      // Sewage daily
      sewageInserts.push(
        ctx.db.insert("sewageReadings", {
          societyId: society._id,
          blockId: block._id,
          stpStatus: d === 20 ? "maintenance" : "normal",
          sludgeTankPct: Math.round(30 + sA * 50),
          treatedTankPct: Math.round(55 + sB * 35),
          inflowRateLPH: Math.round(750 + sC * 300),
          recordedBy: user._id,
          recordedAt: t + 7 * 3600000,
        })
      );

      // Waste daily
      const dryKG = Math.round((35 + sA * 20) * 10) / 10;
      const wetKG = Math.round((55 + sB * 25) * 10) / 10;
      wasteInserts.push(
        ctx.db.insert("wasteLogs", {
          societyId: society._id,
          blockId: block._id,
          dryWasteKG: dryKG,
          wetWasteKG: wetKG,
          totalKG: Math.round((dryKG + wetKG) * 10) / 10,
          segregationOk: sC > 0.12, // ~88% compliance
          loggedBy: user._id,
          loggedAt: t + 9 * 3600000,
        })
      );

      // Gas: weekly
      if (d % 7 === 0) {
        gasInserts.push(
          ctx.db.insert("gasReadings", {
            societyId: society._id,
            blockId: block._id,
            meterReading: Math.round(1000 + (90 - d) * 3.8),
            consumptionSCM: Math.round((3.2 + sA * 0.8) * 10) / 10,
            pressurePSI: Math.round((17 + sB * 5) * 10) / 10,
            recordedBy: user._id,
            recordedAt: t + 10 * 3600000,
          })
        );
      }

      // Garbage collection: every 3 days
      if (d % 3 === 0) {
        const wasCollected = sA > 0.08; // ~92% success
        garbageInserts.push(
          ctx.db.insert("garbageCollectionLog", {
            societyId: society._id,
            blockId: block._id,
            scheduledAt: t + 7 * 3600000,
            collectedAt: wasCollected ? t + 9 * 3600000 : undefined,
            status: wasCollected ? "collected" : "missed",
            vendorId: garbageVendorId,
            confirmedBy: wasCollected ? user._id : undefined,
          })
        );
      }

      // Power outages: every ~20 days
      if (d % 20 === 5) {
        const hrs = Math.round((2 + sB * 4) * 10) / 10;
        outageInserts.push(
          ctx.db.insert("powerOutages", {
            societyId: society._id,
            blockId: block._id,
            dgUnitId,
            startedAt: t + 14 * 3600000,
            endedAt: t + 14 * 3600000 + hrs * 3600000,
            durationHrs: hrs,
            dieselUsedL: Math.round(hrs * 22),
            loggedBy: user._id,
          })
        );
      }

      // Tanker orders: every 25 days (when tank was low)
      if (d % 25 === 10) {
        tankerInserts.push(
          ctx.db.insert("tankerOrders", {
            societyId: society._id,
            blockId: block._id,
            vendorId: waterVendorId,
            quantityKL: 20,
            status: "delivered",
            orderedBy: user._id,
            triggeredBy: "manual",
            scheduledAt: t + DAY,
            deliveredAt: t + DAY + 3 * 3600000,
            cost: 24000,
            createdAt: t,
          })
        );
      }
    }

    await Promise.all([
      ...waterInserts,
      ...powerInserts,
      ...sewageInserts,
      ...wasteInserts,
      ...gasInserts,
      ...garbageInserts,
      ...outageInserts,
      ...tankerInserts,
    ]);

    // --- Active alerts ---
    await Promise.all([
      ctx.db.insert("alerts", {
        societyId: society._id,
        blockId: block._id,
        utility: "water",
        alertType: "predictive",
        severity: "warning",
        title: "Tank level trending down",
        message:
          "Overhead Tank 1 is at 68% and consuming ~11 KL/day. Recommend ordering tanker within 4 days.",
        isResolved: false,
        triggeredAt: now - 2 * 3600000,
      }),
      ctx.db.insert("alerts", {
        societyId: society._id,
        blockId: block._id,
        utility: "power",
        alertType: "threshold",
        severity: "info",
        title: "DG service approaching",
        message:
          "DG Set 1 is at 342 runtime hours. Schedule maintenance before hitting 350 hrs.",
        isResolved: false,
        triggeredAt: now - 6 * 3600000,
      }),
      ctx.db.insert("alerts", {
        societyId: society._id,
        blockId: block._id,
        utility: "sewage",
        alertType: "threshold",
        severity: "warning",
        title: "Sludge tank above 70%",
        message:
          "STP sludge tank at 74%. Schedule desludging before reaching 85% critical threshold.",
        isResolved: false,
        triggeredAt: now - 12 * 3600000,
      }),
    ]);

    return { seeded: true, days: 90 };
  },
});

export const getDemoSociety = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("societies")
      .filter((q) => q.eq(q.field("name"), DEMO_SOCIETY_NAME))
      .first();
  },
});
