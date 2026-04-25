import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEMO_SOCIETY_NAME = "Green Valley Society";
const DEMO_BLOCK_NAME = "Block A";

export const setupDemoUser = mutation({
  args: {
    role: v.union(v.literal("admin"), v.literal("rwa"), v.literal("resident"), v.literal("guard")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    let society = await ctx.db
      .query("societies")
      .filter((q) => q.eq(q.field("name"), DEMO_SOCIETY_NAME))
      .first();

    if (!society) {
      const societyId = await ctx.db.insert("societies", {
        name: DEMO_SOCIETY_NAME,
        address: "14th Cross, Indiranagar, Bangalore",
        city: "Bangalore",
        totalFlats: 120,
        totalBlocks: 3,
        subscriptionPlan: "pro",
        isActive: true,
        mrr: 18000,
        helplinePhone: "+918022334455",
        upiId: "greenvalley@okaxis",
        createdAt: Date.now(),
      });
      society = await ctx.db.get(societyId);
    }

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
        occupiedFlats: 36,
        createdAt: Date.now(),
      });
      block = await ctx.db.get(blockId);

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

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();

    // Derive a unique seed from the full authId string
    const idStr = authId as string;
    let seed = 0;
    for (let i = 0; i < idStr.length; i++) seed = (seed * 31 + idStr.charCodeAt(i)) >>> 0;

    const ADMIN_NAMES = ["Rajesh Srinivasan", "Anand Mehta", "Vikram Bhatia", "Suresh Agarwal", "Karthik Nair", "Deepak Pillai", "Manohar Joshi", "Arvind Kumar", "Harish Reddy", "Girish Kamath", "Sanjay Patel", "Ravi Menon", "Pradeep Hegde", "Naresh Jain", "Vinod Tiwari", "Ashwin Kumar"];
    const RWA_NAMES = ["Prakash Bapat", "Milind Joshi", "Soumitra Dutta", "Venkatesh Reddy", "Anil Kapoor", "Subramaniam Pillai", "Rajan Nair", "Divakar Rao", "Mahesh Iyer", "Santosh Verma", "Ajit Desai", "Ramakrishnan S", "Nagarajan T", "Satish Kulkarni", "Mohandas K", "Kishore Bose"];
    const RESIDENT_NAMES = ["Kavitha Reddy", "Sunita Krishnan", "Rekha Nair", "Deepa Sharma", "Meena Iyer", "Usha Rani", "Ananya Chakraborty", "Latha Venkat", "Parvathi Nair", "Sudha Murthy", "Archana Singh", "Bindu Rao", "Chitra Pillai", "Divya Mohan", "Esha Joshi", "Farah Khan", "Gayathri S", "Hema Malini R", "Indira Patel", "Jyothi Kumar"];
    const GUARD_NAMES = ["Abdul Kalam", "Santhosh P", "Mohan Das", "Raju S", "Sundar V", "Bharat K", "Dinesh T", "Eshwar M", "Feroz Khan", "Govind Rao", "Hanumaiah B", "Imran Shaikh", "Jagadish N", "Karim M", "Lakshmaiah P"];
    const PHONE_PREFIXES = ["9845", "9844", "9886", "9880", "9741", "9731", "9738", "9739", "9972", "9964", "9900", "9901", "9902", "8861", "8867", "7676", "7022", "6360"];
    const phoneSuffix = String(seed % 1000000).padStart(6, "0");
    const phone = `+91${PHONE_PREFIXES[seed % PHONE_PREFIXES.length]}${phoneSuffix}`;
    const roleNameMap = {
      admin: ADMIN_NAMES[seed % ADMIN_NAMES.length],
      rwa: RWA_NAMES[seed % RWA_NAMES.length],
      resident: RESIDENT_NAMES[seed % RESIDENT_NAMES.length],
      guard: GUARD_NAMES[seed % GUARD_NAMES.length],
    };
    const flatNumbers: Record<string, string | undefined> = { admin: undefined, rwa: undefined, resident: "A-204", guard: undefined };
    // "guard" is a UI-only demo alias — store as "staff" in the DB
    const dbRole = args.role === "guard" ? "staff" : args.role;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: roleNameMap[args.role],
        phone,
        role: dbRole,
        societyId: society!._id,
        blockId: block!._id,
        defaultBlockId: block!._id,
        flatNumber: flatNumbers[args.role],
        isActive: true,
      });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier: authId as string,
        name: roleNameMap[args.role],
        phone,
        role: dbRole,
        societyId: society!._id,
        blockId: block!._id,
        defaultBlockId: block!._id,
        flatNumber: flatNumbers[args.role],
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return { societyId: society!._id, blockId: block!._id };
  },
});

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

    const existingWater = await ctx.db
      .query("waterReadings")
      .withIndex("by_society", (q) => q.eq("societyId", society._id))
      .first();

    // Always re-seed today's visitors regardless of skip — so guard demo works every day
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const existingTodayVisitors = await ctx.db
      .query("visitors")
      .withIndex("by_society", q => q.eq("societyId", society._id))
      .filter(q => q.gte(q.field("createdAt"), dayStart.getTime()))
      .first();

    if (existingWater && existingTodayVisitors) return { skipped: true, reason: "Already seeded" };

    if (existingWater && !existingTodayVisitors) {
      // Only re-seed today's visitors
      const nowTs = Date.now(); const HOUR = 3600000;
      const residentUsers = await ctx.db.query("users")
        .withIndex("by_society", q => q.eq("societyId", society._id))
        .filter(q => q.eq(q.field("role"), "resident")).take(5);
      const rIds = residentUsers.map(r => r._id);
      const TV = [
        { name: "Kiran Bhat", phone: "+919911001100", passCode: "720114", hoursAgo: 8, duration: 1 },
        { name: "Neha Verma", phone: "+919911002200", passCode: "385621", hoursAgo: 5, duration: 2 },
        { name: "Sanjay Dubey", phone: "+919911003300", passCode: "914073", hoursAgo: 3, duration: 1 },
        { name: "Pooja Singh", phone: "+919911004400", passCode: "562890", hoursAgo: 2, duration: null },
        { name: "Vikram Nair", phone: "+919911005500", passCode: "103456", hoursAgo: 1, duration: null },
        { name: "Delivery – Amazon", phone: "+919911006600", passCode: "847291", hoursAgo: 0, duration: null },
      ];
      for (let i = 0; i < TV.length; i++) {
        const tv = TV[i];
        const checkedInAt = nowTs - tv.hoursAgo * HOUR;
        await ctx.db.insert("visitors", {
          societyId: society._id,
          registeredBy: (rIds[i % rIds.length] ?? rIds[0]) as any,
          visitorName: tv.name, visitorPhone: tv.phone,
          expectedAt: checkedInAt - 15 * 60000, passCode: tv.passCode,
          checkedInAt: tv.hoursAgo <= 0 ? undefined : checkedInAt,
          checkedOutAt: tv.duration != null ? checkedInAt + tv.duration * HOUR : undefined,
          createdAt: checkedInAt - 15 * 60000,
        });
      }
      return { skipped: true, reason: "Re-seeded today visitors" };
    }

    if (existingWater) return { skipped: true, reason: "Already seeded" };

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const HOUR = 3600000;

    // ── Additional blocks ──────────────────────────────────────────────────────
    const blockBId = await ctx.db.insert("blocks", {
      societyId: society._id,
      name: "Block B",
      type: "block",
      totalFlats: 40,
      occupiedFlats: 38,
      createdAt: now - 400 * DAY,
    });
    const blockCId = await ctx.db.insert("blocks", {
      societyId: society._id,
      name: "Block C",
      type: "tower",
      totalFlats: 40,
      occupiedFlats: 32,
      createdAt: now - 400 * DAY,
    });

    await ctx.db.insert("waterTanks", { societyId: society._id, blockId: blockBId, name: "Overhead Tank 2", type: "overhead", capacityKL: 50, currentLevelPct: 52, lastUpdated: now - 2 * HOUR });
    await ctx.db.insert("waterTanks", { societyId: society._id, blockId: blockCId, name: "Overhead Tank 3", type: "overhead", capacityKL: 60, currentLevelPct: 81, lastUpdated: now - HOUR });
    await ctx.db.insert("waterTanks", { societyId: society._id, blockId: block._id, name: "Sump Tank", type: "sump", capacityKL: 100, currentLevelPct: 74, lastUpdated: now });

    // ── Vendors ────────────────────────────────────────────────────────────────
    const waterVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "AquaFresh Tankers", type: "water_tanker", phone: "+919876543210", whatsapp: "+919876543210", ratePerUnit: 1200, unit: "KL", isPreferred: true, isActive: true, rating: 4, totalJobs: 48 });
    const waterVendor2Id = await ctx.db.insert("vendors", { societyId: society._id, name: "BlueDrop Water Supply", type: "water_tanker", phone: "+919845001122", ratePerUnit: 1100, unit: "KL", isPreferred: false, isActive: true, rating: 3, totalJobs: 12 });
    const dieselVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "PowerFuel Suppliers", type: "diesel", phone: "+919876543211", ratePerUnit: 92, unit: "L", isPreferred: true, isActive: true, rating: 5, totalJobs: 63 });
    const gasVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "IndraGas Agency", type: "gas", phone: "+919845099001", ratePerUnit: 28, unit: "SCM", isPreferred: true, isActive: true, rating: 4, totalJobs: 24 });
    const desludgeVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "CleanWave STP Services", type: "desludge", phone: "+919900123456", ratePerUnit: 3500, unit: "trip", isPreferred: true, isActive: true, rating: 5, totalJobs: 8 });
    const wasteVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "EcoSort Dry Waste", type: "waste_pickup", phone: "+919845022334", isPreferred: true, isActive: true, rating: 4, totalJobs: 36 });
    const garbageVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "CleanCity Waste Mgmt", type: "garbage", phone: "+919876543212", isPreferred: true, isActive: true, rating: 4, totalJobs: 180 });
    const electricalVendorId = await ctx.db.insert("vendors", { societyId: society._id, name: "Sparks Electrical Works", type: "electrical", phone: "+919900456789", isPreferred: true, isActive: true, rating: 5, totalJobs: 27 });
    await ctx.db.insert("vendors", { societyId: society._id, name: "FlowFix Plumbing", type: "plumbing", phone: "+919845077001", isPreferred: false, isActive: true, rating: 3, totalJobs: 14 });

    // ── DG Units ───────────────────────────────────────────────────────────────
    const dgUnitId = await ctx.db.insert("dgUnits", { societyId: society._id, blockId: block._id, name: "DG Set 1 – 125 KVA", capacityKVA: 125, dieselCapacityLiters: 200, dieselLevelLiters: 145, isRunning: false, totalRuntimeHours: 342, consumptionRateLPH: 22, lastServiceDate: now - 45 * DAY, lastUpdated: now - DAY });
    const dgUnit2Id = await ctx.db.insert("dgUnits", { societyId: society._id, blockId: blockBId, name: "DG Set 2 – 100 KVA", capacityKVA: 100, dieselCapacityLiters: 180, dieselLevelLiters: 110, isRunning: false, totalRuntimeHours: 218, consumptionRateLPH: 18, lastServiceDate: now - 30 * DAY, lastUpdated: now - 2 * DAY });

    // ── Residents (users table) ────────────────────────────────────────────────
    const RESIDENTS = [
      { name: "Aditya Rao", flat: "A-101", phone: "+919845011001", email: "aditya.rao@email.com", flatType: "2BHK" },
      { name: "Sunita Krishnan", flat: "A-102", phone: "+919845011002", email: "sunita.k@email.com", flatType: "2BHK" },
      { name: "Rajesh Patel", flat: "A-103", phone: "+919845011003", email: "rajesh.p@email.com", flatType: "3BHK" },
      { name: "Meena Iyer", flat: "A-104", phone: "+919845011004", email: "meena.iyer@email.com", flatType: "2BHK" },
      { name: "Vikram Nair", flat: "A-201", phone: "+919845011005", email: "vikram.n@email.com", flatType: "3BHK" },
      { name: "Priya Menon", flat: "A-204", phone: "+919845011006", email: "priya.m@email.com", flatType: "2BHK" },
      { name: "Suresh Pillai", flat: "A-301", phone: "+919845011007", email: "suresh.p@email.com", flatType: "2BHK" },
      { name: "Kavitha Reddy", flat: "A-302", phone: "+919845011008", email: "kavitha.r@email.com", flatType: "3BHK" },
      { name: "Anand Kumar", flat: "A-401", phone: "+919845011009", email: "anand.k@email.com", flatType: "2BHK" },
      { name: "Deepa Sharma", flat: "A-402", phone: "+919845011010", email: "deepa.s@email.com", flatType: "2BHK" },
      { name: "Ganesh Murthy", flat: "B-101", phone: "+919845011011", email: "ganesh.m@email.com", flatType: "3BHK" },
      { name: "Lakshmi Bai", flat: "B-102", phone: "+919845011012", email: "lakshmi.b@email.com", flatType: "2BHK" },
      { name: "Sanjay Gupta", flat: "B-201", phone: "+919845011013", email: "sanjay.g@email.com", flatType: "2BHK" },
      { name: "Nirmala Devi", flat: "B-202", phone: "+919845011014", email: "nirmala.d@email.com", flatType: "3BHK" },
      { name: "Prakash Hegde", flat: "B-301", phone: "+919845011015", email: "prakash.h@email.com", flatType: "2BHK" },
      { name: "Rekha Nair", flat: "C-101", phone: "+919845011016", email: "rekha.n@email.com", flatType: "3BHK" },
      { name: "Mohan Das", flat: "C-102", phone: "+919845011017", email: "mohan.d@email.com", flatType: "2BHK" },
      { name: "Usha Rani", flat: "C-201", phone: "+919845011018", email: "usha.r@email.com", flatType: "2BHK" },
      { name: "Kiran Bhat", flat: "C-202", phone: "+919845011019", email: "kiran.b@email.com", flatType: "3BHK" },
      { name: "Arjun Shetty", flat: "C-301", phone: "+919845011020", email: "arjun.s@email.com", flatType: "2BHK" },
    ];

    const residentIds: Id<"users">[] = [];
    for (const r of RESIDENTS) {
      const blockId = r.flat.startsWith("A") ? block._id : r.flat.startsWith("B") ? blockBId : blockCId;
      const rid = await ctx.db.insert("users", {
        societyId: society._id,
        blockId,
        defaultBlockId: blockId,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: "resident",
        flatNumber: r.flat,
        flatType: r.flatType,
        isActive: true,
        moveInDate: now - Math.floor(Math.random() * 700 + 100) * DAY,
        notifInApp: true,
        notifWhatsapp: true,
        onboardingComplete: true,
        createdAt: now - 300 * DAY,
      });
      residentIds.push(rid);
    }

    // ── RWA Manager ────────────────────────────────────────────────────────────
    const rwaManagerId = await ctx.db.insert("users", {
      societyId: society._id,
      blockId: block._id,
      defaultBlockId: block._id,
      name: "Arun Sharma",
      email: "arun.rwa@greenvalley.in",
      phone: "+919845099100",
      role: "rwa",
      isActive: true,
      onboardingComplete: true,
      createdAt: now - 400 * DAY,
    });

    // ── Staff ──────────────────────────────────────────────────────────────────
    const STAFF = [
      { name: "Ramesh Kumar", role: "Security Guard", phone: "+919876543213", shift: "morning" as const, isOnDuty: true, since: 60 },
      { name: "Suresh Nair", role: "Security Guard", phone: "+919876543214", shift: "night" as const, isOnDuty: false, since: 55 },
      { name: "Priya Devi", role: "STP Operator", phone: "+919876543215", shift: "full_day" as const, isOnDuty: true, since: 90 },
      { name: "Murugan S", role: "Housekeeping", phone: "+919876543216", shift: "morning" as const, isOnDuty: true, since: 45 },
      { name: "Lakshmi G", role: "Housekeeping", phone: "+919876543217", shift: "afternoon" as const, isOnDuty: true, since: 30 },
      { name: "Ravi Shankar", role: "Electrician", phone: "+919876543218", shift: "full_day" as const, isOnDuty: false, since: 120 },
      { name: "Deepak T", role: "Plumber", phone: "+919876543219", shift: "morning" as const, isOnDuty: true, since: 80 },
      { name: "Santhosh P", role: "Lift Operator", phone: "+919876543220", shift: "morning" as const, isOnDuty: true, since: 25 },
      { name: "Mary Joseph", role: "Garden Maintenance", phone: "+919876543221", shift: "morning" as const, isOnDuty: true, since: 50 },
      { name: "Abdul Kalam", role: "Security Guard", phone: "+919876543222", shift: "afternoon" as const, isOnDuty: true, since: 70 },
    ];

    const staffIds: string[] = [];
    for (const s of STAFF) {
      const sid = await ctx.db.insert("staff", {
        societyId: society._id,
        name: s.name,
        role: s.role,
        phone: s.phone,
        shift: s.shift,
        isOnDuty: s.isOnDuty,
        lastAttendanceAt: now - (s.isOnDuty ? 1 * HOUR : 14 * HOUR),
        createdAt: now - s.since * DAY,
      });
      staffIds.push(sid);
    }

    // ── Maintenance charges ────────────────────────────────────────────────────
    await ctx.db.insert("maintenanceCharges", { societyId: society._id, flatType: "2BHK", monthlyAmount: 3500, dueDay: 5, lateFeeAmount: 200, lateFeeType: "flat", effectiveFrom: now - 180 * DAY });
    await ctx.db.insert("maintenanceCharges", { societyId: society._id, flatType: "3BHK", monthlyAmount: 5000, dueDay: 5, lateFeeAmount: 300, lateFeeType: "flat", effectiveFrom: now - 180 * DAY });

    // ── Payments ───────────────────────────────────────────────────────────────
    const MONTHS = [1, 2, 3, 4, 5];
    for (let i = 0; i < Math.min(residentIds.length, 15); i++) {
      const rid = residentIds[i];
      const res = RESIDENTS[i];
      const amount = res.flatType === "3BHK" ? 5000 : 3500;
      const blockId = res.flat.startsWith("A") ? block._id : res.flat.startsWith("B") ? blockBId : blockCId;
      for (const m of MONTHS) {
        const dueDate = now - m * 30 * DAY;
        const isPaid = m > 1 || i % 5 !== 0;
        await ctx.db.insert("payments", {
          societyId: society._id,
          blockId,
          residentId: rid,
          type: "monthly_maintenance",
          description: `Maintenance - Month ${6 - m}`,
          amount,
          dueDate,
          status: isPaid ? "confirmed" : m === 1 ? "overdue" : "confirmed",
          paidAt: isPaid ? dueDate + 3 * DAY : undefined,
          paymentMethod: ["upi", "online", "bank_transfer"][i % 3] as any,
          confirmedBy: rwaManagerId,
          createdAt: dueDate - 5 * DAY,
        });
      }
    }
    // Pending payments for a few residents
    for (let i = 0; i < 4; i++) {
      const rid = residentIds[i + 5];
      const res = RESIDENTS[i + 5];
      const blockId = res.flat.startsWith("A") ? block._id : res.flat.startsWith("B") ? blockBId : blockCId;
      await ctx.db.insert("payments", {
        societyId: society._id,
        blockId,
        residentId: rid,
        type: "monthly_maintenance",
        description: "Maintenance - Current Month",
        amount: res.flatType === "3BHK" ? 5000 : 3500,
        dueDate: now + 3 * DAY,
        status: "pending",
        createdAt: now - 2 * DAY,
      });
    }

    // ── Service requests ───────────────────────────────────────────────────────
    const SERVICE_REQUESTS = [
      { res: 0, cat: "Plumbing", desc: "Kitchen tap leaking continuously. Water dripping even when fully closed.", priority: "urgent" as const, status: "open" as const, daysAgo: 1 },
      { res: 1, cat: "Electrical", desc: "Living room light flickering. Suspect loose connection in switch board.", priority: "medium" as const, status: "in_progress" as const, daysAgo: 3 },
      { res: 2, cat: "Plumbing", desc: "Bathroom drain choked. Water not draining properly.", priority: "medium" as const, status: "resolved" as const, daysAgo: 7 },
      { res: 3, cat: "Lift", desc: "Lift jerking on floor 2. Makes loud noise during ascent.", priority: "urgent" as const, status: "in_progress" as const, daysAgo: 2 },
      { res: 4, cat: "Electrical", desc: "Common area light on staircase between 3rd and 4th floor not working.", priority: "low" as const, status: "open" as const, daysAgo: 5 },
      { res: 5, cat: "Plumbing", desc: "Water pressure very low in morning hours (6am - 8am).", priority: "medium" as const, status: "open" as const, daysAgo: 4 },
      { res: 6, cat: "Pest Control", desc: "Cockroach infestation in kitchen area. Found near drainage pipe.", priority: "urgent" as const, status: "open" as const, daysAgo: 1 },
      { res: 7, cat: "Painting", desc: "Seepage marks on bedroom ceiling wall after last rain.", priority: "low" as const, status: "resolved" as const, daysAgo: 20 },
      { res: 8, cat: "Electrical", desc: "MCB tripping frequently in flat. Replaced twice in last month.", priority: "urgent" as const, status: "in_progress" as const, daysAgo: 2 },
      { res: 9, cat: "Plumbing", desc: "Overhead tank water supply not reaching 4th floor adequately.", priority: "medium" as const, status: "open" as const, daysAgo: 3 },
      { res: 10, cat: "Intercom", desc: "Intercom not working. Cannot receive calls from gate.", priority: "low" as const, status: "open" as const, daysAgo: 6 },
      { res: 11, cat: "Lift", desc: "Lift door not closing properly on ground floor.", priority: "medium" as const, status: "resolved" as const, daysAgo: 10 },
    ];

    for (const sr of SERVICE_REQUESTS) {
      const res = RESIDENTS[sr.res];
      const blockId = res.flat.startsWith("A") ? block._id : res.flat.startsWith("B") ? blockBId : blockCId;
      await ctx.db.insert("serviceRequests", {
        societyId: society._id,
        blockId,
        residentId: residentIds[sr.res],
        category: sr.cat,
        description: sr.desc,
        priority: sr.priority,
        status: sr.status,
        assignedTo: sr.status !== "open" ? rwaManagerId : undefined,
        resolvedAt: sr.status === "resolved" ? now - 2 * DAY : undefined,
        residentRating: sr.status === "resolved" ? ([4, 5, 3, 5][sr.res % 4]) : undefined,
        createdAt: now - sr.daysAgo * DAY,
      });
    }

    // ── Broadcasts ─────────────────────────────────────────────────────────────
    const BROADCASTS = [
      { title: "Water Supply Interruption – Block A", message: "Due to STP maintenance, water supply to Block A will be interrupted on Saturday 6 AM to 12 PM. Please store adequate water. Inconvenience regretted.", type: "maintenance" as const, daysAgo: 2, sent: 36 },
      { title: "Society AGM – 28th April 2025", message: "Annual General Meeting of Green Valley RWA is scheduled on 28th April at 6:30 PM in the Community Hall. All owners are requested to attend. Key agenda: audited accounts, maintenance fee revision, security upgrade.", type: "info" as const, daysAgo: 5, sent: 120 },
      { title: "URGENT: Gas Leak Suspected – Block C", message: "A mild gas smell has been reported near Block C staircase. As a precaution, please do NOT use open flames or switches. Gas company has been contacted. Please evacuate if the smell intensifies.", type: "alert" as const, daysAgo: 12, sent: 120 },
      { title: "Pest Control Treatment – All Blocks", message: "Professional pest control treatment scheduled for all common areas on 20th April (Sunday) 9 AM – 1 PM. Residents on ground floor please keep pets and children indoors.", type: "maintenance" as const, daysAgo: 8, sent: 120 },
      { title: "Parking Rule Reminder", message: "Residents are reminded that visitor parking is only permitted in the designated yellow-marked slots. Cars parked in residents' allotted slots will be towed at owner's expense.", type: "info" as const, daysAgo: 15, sent: 120 },
      { title: "Power Outage – 22nd April", message: "BESCOM has scheduled a power shutdown for transformer maintenance on 22nd April, 10 AM – 4 PM. DG backup will be available for lifts and common areas only.", type: "warning" as const, daysAgo: 3, sent: 120 },
      { title: "Welcome New Residents!", message: "Please join us in welcoming the Sharma family (B-201) and the Nair family (C-301) to our community. Welcome tea scheduled this Sunday 5 PM at the club house.", type: "info" as const, daysAgo: 18, sent: 120 },
      { title: "Maintenance Due Reminder – April", message: "Maintenance dues for April are due by 5th April. Please pay via UPI to greenvalley@okaxis or drop cheque in the office drop box. Late fees apply from 10th.", type: "info" as const, daysAgo: 22, sent: 120 },
      { title: "Security Alert: Unknown Vehicle", message: "A white Maruti Swift (KA03 XX9901) was found parked in the society premises for 3 consecutive days without registration. Security is investigating. Please report any information to the guard.", type: "alert" as const, daysAgo: 6, sent: 120 },
      { title: "Yoga & Fitness Classes – April Schedule", message: "Morning yoga classes will be held at the terrace garden every Tuesday and Friday 6:30 AM onwards. No charges. Please bring your own mat. Contact Mrs. Kavitha (A-302) for details.", type: "info" as const, daysAgo: 25, sent: 80 },
    ];

    for (const b of BROADCASTS) {
      const sentAt = now - b.daysAgo * DAY;
      await ctx.db.insert("broadcasts", {
        societyId: society._id,
        blockId: block._id,
        sentBy: rwaManagerId,
        title: b.title,
        message: b.message,
        type: b.type,
        targetAudience: "all_residents",
        channels: ["in_app", "whatsapp"],
        sentCount: b.sent,
        deliveredCount: Math.floor(b.sent * 0.92),
        sentAt,
        createdAt: sentAt,
      });
    }

    // ── Notices ────────────────────────────────────────────────────────────────
    const NOTICES = [
      { title: "Garbage Collection Timings Changed", content: "Effective immediately, dry waste collection will happen on Mondays and Thursdays between 8–10 AM. Wet waste daily 7–9 AM. Please keep bags outside your door by 7 AM.", type: "general" as const, pinned: true, daysAgo: 3 },
      { title: "Emergency: Water Tanker Ordered", content: "Due to BWSSB supply disruption, an emergency water tanker has been arranged for tonight. Tanker will arrive at 8 PM. Residents on upper floors please ensure taps are closed.", type: "emergency" as const, pinned: true, daysAgo: 1 },
      { title: "Maintenance Payment Dues – March", content: "Several residents have outstanding maintenance dues for March. Kindly clear dues before 15th April to avoid penalty charges of ₹200/month.", type: "payment" as const, pinned: false, daysAgo: 7 },
      { title: "Lift Maintenance – Block A & B", content: "KONE technicians will service lifts in Block A and B on Friday 25th April 10 AM – 2 PM. Please use stairs during this time. Senior citizens may contact the office for assistance.", type: "maintenance" as const, pinned: false, daysAgo: 2 },
      { title: "Swimming Pool Closure", content: "The swimming pool will remain closed from 20–27 April for annual maintenance and water treatment. It will reopen on 28th April.", type: "maintenance" as const, pinned: false, daysAgo: 4 },
    ];

    for (const n of NOTICES) {
      await ctx.db.insert("notices", {
        societyId: society._id,
        blockId: block._id,
        title: n.title,
        content: n.content,
        type: n.type,
        postedBy: rwaManagerId,
        isPinned: n.pinned,
        expiresAt: now + 14 * DAY,
        createdAt: now - n.daysAgo * DAY,
      });
    }

    // ── Admin Tickets ──────────────────────────────────────────────────────────
    const TICKETS = [
      { subject: "Billing discrepancy – February invoice", cat: "Billing", desc: "We were charged ₹6,200 for February maintenance but our flat type is 2BHK. Rate should be ₹3,500. Please clarify.", priority: "high" as const, status: "open" as const, daysAgo: 4 },
      { subject: "App not showing water data", cat: "App Support", desc: "Water utility page shows 'No data' even after logging in multiple times. Using iPhone 14, app version 2.1.0.", priority: "medium" as const, status: "in_progress" as const, daysAgo: 8 },
      { subject: "RWA manager not responding to requests", cat: "Complaint", desc: "Service request #47 has been open for 15 days with no update. Plumbing issue in Flat A-103 still unresolved. Escalating to admin.", priority: "urgent" as const, status: "open" as const, daysAgo: 2 },
      { subject: "Upgrade to Enterprise plan", cat: "Subscription", desc: "We would like to upgrade from Pro to Enterprise to unlock multi-society management. Please send commercial proposal.", priority: "low" as const, status: "resolved" as const, daysAgo: 20 },
      { subject: "Security camera footage request", cat: "Security", desc: "Requesting CCTV footage from main gate on 18th April 7–9 PM for incident investigation. A resident's bike was damaged in the parking lot.", priority: "high" as const, status: "in_progress" as const, daysAgo: 3 },
      { subject: "Feature request: Visitor pre-registration", cat: "Feature Request", desc: "Would like visitors to be able to pre-register via WhatsApp before arriving. Currently guards manually verify each visitor.", priority: "low" as const, status: "open" as const, daysAgo: 12 },
    ];

    for (const t of TICKETS) {
      await ctx.db.insert("adminTickets", {
        societyId: society._id,
        raisedBy: rwaManagerId,
        subject: t.subject,
        category: t.cat,
        description: t.desc,
        priority: t.priority,
        status: t.status,
        resolvedAt: t.status === "resolved" ? now - 15 * DAY : undefined,
        createdAt: now - t.daysAgo * DAY,
      });
    }

    // ── Alerts ─────────────────────────────────────────────────────────────────
    const ALERTS = [
      { util: "water" as const, type: "predictive" as const, sev: "warning" as const, title: "Tank level trending down – Block A", msg: "Overhead Tank 1 (Block A) at 68% and consuming ~11 KL/day. Estimated to reach critical 30% in 3.5 days. Recommend ordering tanker within 48 hours.", hrsAgo: 2 },
      { util: "power" as const, type: "threshold" as const, sev: "info" as const, title: "DG service due soon", msg: "DG Set 1 is at 342 runtime hours. Scheduled service threshold is 350 hrs. Book maintenance before next outage.", hrsAgo: 6 },
      { util: "sewage" as const, type: "threshold" as const, sev: "warning" as const, title: "STP sludge tank above 70%", msg: "Block A sludge tank at 74%. Schedule desludging before reaching 85% critical limit. Last desludging was 45 days ago.", hrsAgo: 12 },
      { util: "water" as const, type: "anomaly" as const, sev: "critical" as const, title: "Unusual water consumption spike – Block C", msg: "Water consumption in Block C jumped 40% vs 7-day average between 2 AM and 4 AM. Possible pipe burst or undetected leak. Immediate inspection recommended.", hrsAgo: 8 },
      { util: "gas" as const, type: "threshold" as const, sev: "warning" as const, title: "Gas pressure below normal", msg: "Gas pressure readings for Block B dropped to 14.2 PSI (normal: 17–22 PSI) over last 3 readings. Contact IndraGas Agency.", hrsAgo: 18 },
      { util: "power" as const, type: "anomaly" as const, sev: "critical" as const, title: "Power consumption 35% above average – Block B", msg: "Block B consumed 310 kWh yesterday vs 7-day average of 230 kWh. Check for unauthorized high-load appliances or wiring fault.", hrsAgo: 20 },
      { util: "garbage" as const, type: "threshold" as const, sev: "info" as const, title: "Garbage collection missed – Block A", msg: "CleanCity Waste Mgmt missed today's scheduled collection (7 AM slot). Contact vendor or arrange alternative.", hrsAgo: 5 },
      { util: "waste" as const, type: "anomaly" as const, sev: "warning" as const, title: "Waste segregation compliance dropping", msg: "Segregation compliance for Block B dropped from 91% to 67% over last 7 days. Consider sending reminder notice to residents.", hrsAgo: 36 },
      { util: "water" as const, type: "predictive" as const, sev: "info" as const, title: "Tanker delivery optimal window", msg: "Based on current consumption rate, best window for tanker delivery is tomorrow 7–10 AM when sump level will be at 45%. Pre-order recommended.", hrsAgo: 4, resolved: true },
    ];

    for (const a of ALERTS) {
      await ctx.db.insert("alerts", {
        societyId: society._id,
        blockId: block._id,
        utility: a.util,
        alertType: a.type,
        severity: a.sev,
        title: a.title,
        message: a.msg,
        isResolved: a.resolved ?? false,
        resolvedBy: a.resolved ? rwaManagerId : undefined,
        resolvedAt: a.resolved ? now - 1 * HOUR : undefined,
        triggeredAt: now - a.hrsAgo * HOUR,
      });
    }

    // ── Historical readings (90 days) ──────────────────────────────────────────
    const allInserts: Promise<any>[] = [];

    for (let d = 90; d >= 1; d--) {
      const t = now - d * DAY;
      const sA = Math.sin(d * 0.37) * 0.5 + 0.5;
      const sB = Math.sin(d * 0.71 + 1) * 0.5 + 0.5;
      const sC = Math.sin(d * 0.19 + 2) * 0.5 + 0.5;
      const isWeekend = (new Date(t).getDay() === 0 || new Date(t).getDay() === 6);
      const demandFactor = isWeekend ? 1.18 : 1.0;

      // Water – 3 readings/day (morning/afternoon/night)
      allInserts.push(ctx.db.insert("waterReadings", { societyId: society._id, blockId: block._id, source: "cauvery", readingType: "consumption", value: Math.round((8 + sA * 6) * demandFactor * 10) / 10, unit: "kl", recordedBy: user._id, recordedAt: t + 8 * HOUR }));
      allInserts.push(ctx.db.insert("waterReadings", { societyId: society._id, blockId: block._id, source: d % 14 === 0 ? "tanker" : "cauvery", readingType: "inflow", value: Math.round((5 + sB * 4) * 10) / 10, unit: "kl", recordedBy: user._id, recordedAt: t + 14 * HOUR }));
      allInserts.push(ctx.db.insert("waterReadings", { societyId: society._id, blockId: blockBId, source: "cauvery", readingType: "consumption", value: Math.round((7 + sC * 5) * demandFactor * 10) / 10, unit: "kl", recordedBy: user._id, recordedAt: t + 8 * HOUR }));

      // Power – grid + solar
      allInserts.push(ctx.db.insert("powerReadings", { societyId: society._id, blockId: block._id, source: "grid", readingType: "consumption", valueKWH: Math.round((190 + sB * 80) * demandFactor), recordedBy: user._id, recordedAt: t + 8 * HOUR }));
      allInserts.push(ctx.db.insert("powerReadings", { societyId: society._id, blockId: block._id, source: "solar", readingType: "generation", valueKWH: Math.round(18 + sA * 12), recordedBy: user._id, recordedAt: t + 12 * HOUR }));
      allInserts.push(ctx.db.insert("powerReadings", { societyId: society._id, blockId: blockBId, source: "grid", readingType: "consumption", valueKWH: Math.round((170 + sC * 70) * demandFactor), recordedBy: user._id, recordedAt: t + 8 * HOUR }));

      // Sewage
      allInserts.push(ctx.db.insert("sewageReadings", { societyId: society._id, blockId: block._id, stpStatus: (d === 20 || d === 55) ? "maintenance" : "normal", sludgeTankPct: Math.round(30 + sA * 50), treatedTankPct: Math.round(55 + sB * 35), inflowRateLPH: Math.round(750 + sC * 300), recordedBy: user._id, recordedAt: t + 7 * HOUR }));

      // Waste
      const dryKG = Math.round((35 + sA * 20) * demandFactor * 10) / 10;
      const wetKG = Math.round((55 + sB * 25) * demandFactor * 10) / 10;
      allInserts.push(ctx.db.insert("wasteLogs", { societyId: society._id, blockId: block._id, dryWasteKG: dryKG, wetWasteKG: wetKG, totalKG: Math.round((dryKG + wetKG) * 10) / 10, segregationOk: sC > 0.12, loggedBy: user._id, loggedAt: t + 9 * HOUR }));

      // Gas – every 3 days
      if (d % 3 === 0) {
        allInserts.push(ctx.db.insert("gasReadings", { societyId: society._id, blockId: block._id, meterReading: Math.round(1000 + (90 - d) * 3.8), consumptionSCM: Math.round((3.2 + sA * 0.8) * 10) / 10, pressurePSI: Math.round((17 + sB * 5) * 10) / 10, recordedBy: user._id, recordedAt: t + 10 * HOUR }));
      }

      // Garbage – every 2 days
      if (d % 2 === 0) {
        const collected = sA > 0.08;
        allInserts.push(ctx.db.insert("garbageCollectionLog", { societyId: society._id, blockId: block._id, scheduledAt: t + 7 * HOUR, collectedAt: collected ? t + 9 * HOUR : undefined, status: collected ? "collected" : "missed", vendorId: garbageVendorId, confirmedBy: collected ? user._id : undefined }));
      }

      // Power outages – every ~18 days
      if (d % 18 === 5) {
        const hrs = Math.round((2 + sB * 4) * 10) / 10;
        allInserts.push(ctx.db.insert("powerOutages", { societyId: society._id, blockId: block._id, dgUnitId, startedAt: t + 14 * HOUR, endedAt: t + 14 * HOUR + hrs * HOUR, durationHrs: hrs, dieselUsedL: Math.round(hrs * 22), loggedBy: user._id }));
      }

      // Tanker orders – every 22 days
      if (d % 22 === 8) {
        allInserts.push(ctx.db.insert("tankerOrders", { societyId: society._id, blockId: block._id, vendorId: waterVendorId, quantityKL: 20, status: "delivered", orderedBy: user._id, triggeredBy: "manual", scheduledAt: t + DAY, deliveredAt: t + DAY + 3 * HOUR, cost: 24000, createdAt: t }));
      }
    }

    // Prediction log – 30 entries
    for (let i = 30; i >= 1; i--) {
      const t = now - i * DAY;
      const sA = Math.sin(i * 0.37) * 0.5 + 0.5;
      allInserts.push(ctx.db.insert("predictionLog", {
        societyId: society._id,
        blockId: block._id,
        utility: ["water", "power", "diesel"][i % 3],
        predictionType: i % 2 === 0 ? "consumption_forecast" : "refill_alert",
        predictedValue: Math.round((10 + sA * 8) * 10) / 10,
        predictedAt: t,
        eventDate: t + 3 * DAY,
        confidenceScore: Math.round((0.72 + sA * 0.22) * 100) / 100,
        actualValue: i > 3 ? Math.round((10 + sA * 7) * 10) / 10 : undefined,
        wasAccurate: i > 3 ? sA > 0.15 : undefined,
        modelVersion: "v2.1",
      }));
    }

    // Shifts – last 14 days
    for (const sid of staffIds.slice(0, 6)) {
      for (let d = 14; d >= 1; d--) {
        const t = now - d * DAY;
        const present = Math.sin(d + sid.length) > -0.7;
        allInserts.push(ctx.db.insert("shifts", {
          societyId: society._id,
          staffId: sid as any,
          blockId: block._id,
          date: t,
          shiftType: "morning",
          startTime: "06:00",
          endTime: "14:00",
          status: present ? "present" : d % 7 === 0 ? "leave" : "absent",
          markedBy: rwaManagerId,
          markedAt: t + 6 * HOUR + 15 * 60000,
        }));
      }
    }

    // Visitors – last 10 days
    const VISITOR_NAMES = [
      ["Amit Joshi", "+919900001111"], ["Sundar Pichai", "+919900002222"], ["Renu Kapoor", "+919900003333"],
      ["Manoj Tiwari", "+919900004444"], ["Divya Pillai", "+919900005555"], ["Faisal Khan", "+919900006666"],
      ["Geeta Sharma", "+919900007777"], ["Harish Rao", "+919900008888"], ["Isha Patel", "+919900009999"],
      ["Jayesh Modi", "+919900010000"],
    ];
    for (let i = 0; i < VISITOR_NAMES.length; i++) {
      const [vname, vphone] = VISITOR_NAMES[i];
      const t = now - (10 - i) * DAY;
      allInserts.push(ctx.db.insert("visitors", {
        societyId: society._id,
        registeredBy: residentIds[i % residentIds.length] as any,
        visitorName: vname,
        visitorPhone: vphone,
        expectedAt: t + 15 * HOUR,
        passCode: String(200100 + i).slice(0, 6),
        checkedInAt: t + 15 * HOUR + 5 * 60000,
        checkedOutAt: i < 8 ? t + 17 * HOUR : undefined,
        createdAt: t + 12 * HOUR,
      }));
    }

    // Today's visitors – for guard demo "Today's Log"
    const TODAY_VISITORS = [
      { name: "Kiran Bhat", phone: "+919911001100", resident: 0, passCode: "720114", hoursAgo: 8, duration: 1 },
      { name: "Neha Verma", phone: "+919911002200", resident: 1, passCode: "385621", hoursAgo: 5, duration: 2 },
      { name: "Sanjay Dubey", phone: "+919911003300", resident: 2, passCode: "914073", hoursAgo: 3, duration: 1 },
      { name: "Pooja Singh", phone: "+919911004400", resident: 3, passCode: "562890", hoursAgo: 2, duration: null },
      { name: "Vikram Nair", phone: "+919911005500", resident: 4, passCode: "103456", hoursAgo: 1, duration: null },
      { name: "Delivery – Amazon", phone: "+919911006600", resident: 1, passCode: "847291", hoursAgo: 0, duration: null },
    ];
    for (const tv of TODAY_VISITORS) {
      const checkedInAt = now - tv.hoursAgo * HOUR;
      allInserts.push(ctx.db.insert("visitors", {
        societyId: society._id,
        registeredBy: residentIds[tv.resident % residentIds.length] as any,
        visitorName: tv.name,
        visitorPhone: tv.phone,
        expectedAt: checkedInAt - 15 * 60000,
        passCode: tv.passCode,
        checkedInAt: tv.hoursAgo <= 0 ? undefined : checkedInAt,
        checkedOutAt: tv.duration != null ? checkedInAt + tv.duration * HOUR : undefined,
        createdAt: checkedInAt - 15 * 60000,
      }));
    }

    // Vehicles
    const VEHICLES = [
      { res: 0, num: "KA01AB1234", type: "car" as const, slot: "A-01" },
      { res: 1, num: "KA02CD5678", type: "car" as const, slot: "A-02" },
      { res: 2, num: "KA03EF9012", type: "car" as const, slot: "A-03" },
      { res: 2, num: "KA03GH3456", type: "bike" as const, slot: "B-01" },
      { res: 3, num: "KA04IJ7890", type: "car" as const, slot: "A-04" },
      { res: 4, num: "KA05KL2345", type: "car" as const, slot: "A-05" },
      { res: 5, num: "KA06MN6789", type: "bike" as const, slot: "B-02" },
      { res: 6, num: "KA07OP1234", type: "car" as const, slot: "A-06" },
      { res: 7, num: "KA08QR5678", type: "car" as const, slot: "A-07" },
      { res: 8, num: "KA09ST9012", type: "bike" as const, slot: "B-03" },
    ];
    for (const v of VEHICLES) {
      allInserts.push(ctx.db.insert("vehicles", {
        societyId: society._id,
        residentId: residentIds[v.res] as any,
        vehicleNumber: v.num,
        type: v.type,
        parkingSlot: v.slot,
        createdAt: now - 200 * DAY,
      }));
    }

    // Tasks
    const TASKS = [
      { title: "Schedule DG servicing before 350 hrs", desc: "DG Set 1 approaching service threshold. Book AMC vendor.", priority: "high" as const, status: "open" as const },
      { title: "Follow up on missed garbage collection", desc: "CleanCity missed Block A collection on 22nd April. Call +919876543212.", priority: "medium" as const, status: "in_progress" as const },
      { title: "Send maintenance due reminder", desc: "4 flats have pending March dues. Send WhatsApp reminder.", priority: "medium" as const, status: "done" as const },
      { title: "Inspect Block C terrace waterproofing", desc: "Multiple residents reported seepage after last rain. Inspect before monsoon.", priority: "high" as const, status: "open" as const },
      { title: "Renew security agency contract", desc: "Current contract with SecureGuard expires on 1st June. Get 3 quotes.", priority: "low" as const, status: "open" as const },
      { title: "Update society insurance documents", desc: "Annual fire & building insurance renewal due end of month.", priority: "medium" as const, status: "open" as const },
    ];
    for (const task of TASKS) {
      allInserts.push(ctx.db.insert("tasks", {
        societyId: society._id,
        blockId: block._id,
        title: task.title,
        description: task.desc,
        priority: task.priority,
        status: task.status,
        assignedTo: staffIds[0] as any,
        createdBy: rwaManagerId,
        createdAt: now - 5 * DAY,
        completedAt: task.status === "done" ? now - 1 * DAY : undefined,
        dueAt: now + 7 * DAY,
      }));
    }

    await Promise.all(allInserts);

    return { seeded: true, days: 90, residents: RESIDENTS.length, staff: STAFF.length, broadcasts: BROADCASTS.length };
  },
});

export const seedExtraSocieties = mutation({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    const SOCIETIES = [
      {
        name: "Sunrise Heights",
        address: "Baner Road, Pune",
        city: "Pune",
        totalFlats: 96,
        totalBlocks: 2,
        plan: "pro" as const,
        mrr: 14400,
        upi: "sunriseheights@okicici",
        phone: "+912020334455",
        blocks: [
          { name: "Tower 1", flats: 48, occupied: 44 },
          { name: "Tower 2", flats: 48, occupied: 40 },
        ],
        residents: [
          { name: "Amit Desai", flat: "T1-101", phone: "+919823001001", email: "amit.d@email.com", ft: "2BHK" },
          { name: "Pooja Joshi", flat: "T1-102", phone: "+919823001002", email: "pooja.j@email.com", ft: "2BHK" },
          { name: "Rahul Kulkarni", flat: "T1-201", phone: "+919823001003", email: "rahul.k@email.com", ft: "3BHK" },
          { name: "Sneha Patil", flat: "T1-202", phone: "+919823001004", email: "sneha.p@email.com", ft: "2BHK" },
          { name: "Nikhil Mehta", flat: "T1-301", phone: "+919823001005", email: "nikhil.m@email.com", ft: "3BHK" },
          { name: "Anita Shah", flat: "T1-401", phone: "+919823001006", email: "anita.s@email.com", ft: "2BHK" },
          { name: "Vijay Borse", flat: "T2-101", phone: "+919823001007", email: "vijay.b@email.com", ft: "2BHK" },
          { name: "Meera Deshpande", flat: "T2-102", phone: "+919823001008", email: "meera.d@email.com", ft: "3BHK" },
          { name: "Saurabh Wagh", flat: "T2-201", phone: "+919823001009", email: "saurabh.w@email.com", ft: "2BHK" },
          { name: "Kaveri Apte", flat: "T2-301", phone: "+919823001010", email: "kaveri.a@email.com", ft: "2BHK" },
          { name: "Dinesh Naik", flat: "T1-103", phone: "+919823001011", email: "dinesh.n@email.com", ft: "2BHK" },
          { name: "Supriya Gharat", flat: "T2-202", phone: "+919823001012", email: "supriya.g@email.com", ft: "3BHK" },
        ],
        rwaName: "Prakash Bapat",
        rwaEmail: "prakash.rwa@sunriseheights.in",
        rwaPhone: "+919823099100",
      },
      {
        name: "Marina Bay Residency",
        address: "Thoraipakkam, Chennai",
        city: "Chennai",
        totalFlats: 144,
        totalBlocks: 3,
        plan: "enterprise" as const,
        mrr: 36000,
        upi: "marinabay@okhdfc",
        phone: "+914428990011",
        blocks: [
          { name: "Block A", flats: 48, occupied: 46 },
          { name: "Block B", flats: 48, occupied: 45 },
          { name: "Block C", flats: 48, occupied: 42 },
        ],
        residents: [
          { name: "Senthil Kumar", flat: "A-101", phone: "+919841001001", email: "senthil.k@email.com", ft: "2BHK" },
          { name: "Geetha Rajan", flat: "A-102", phone: "+919841001002", email: "geetha.r@email.com", ft: "3BHK" },
          { name: "Muthu Krishnan", flat: "A-201", phone: "+919841001003", email: "muthu.k@email.com", ft: "2BHK" },
          { name: "Lavanya Sundaram", flat: "A-301", phone: "+919841001004", email: "lavanya.s@email.com", ft: "2BHK" },
          { name: "Balamurugan T", flat: "B-101", phone: "+919841001005", email: "bala.t@email.com", ft: "3BHK" },
          { name: "Revathi Mohan", flat: "B-102", phone: "+919841001006", email: "revathi.m@email.com", ft: "2BHK" },
          { name: "Arumugam P", flat: "B-201", phone: "+919841001007", email: "arumugam.p@email.com", ft: "2BHK" },
          { name: "Nithya Anand", flat: "B-301", phone: "+919841001008", email: "nithya.a@email.com", ft: "3BHK" },
          { name: "Venkatesan R", flat: "C-101", phone: "+919841001009", email: "venkat.r@email.com", ft: "2BHK" },
          { name: "Padmavathi G", flat: "C-102", phone: "+919841001010", email: "padma.g@email.com", ft: "2BHK" },
          { name: "Karthikeyan S", flat: "C-201", phone: "+919841001011", email: "karthi.s@email.com", ft: "3BHK" },
          { name: "Thilagavathi N", flat: "C-301", phone: "+919841001012", email: "thilaga.n@email.com", ft: "2BHK" },
          { name: "Radhakrishnan V", flat: "A-401", phone: "+919841001013", email: "radha.v@email.com", ft: "3BHK" },
          { name: "Saraswathi M", flat: "B-401", phone: "+919841001014", email: "saras.m@email.com", ft: "2BHK" },
          { name: "Dinakaran J", flat: "C-401", phone: "+919841001015", email: "dina.j@email.com", ft: "2BHK" },
        ],
        rwaName: "Subramaniam Pillai",
        rwaEmail: "sub.rwa@marinabay.in",
        rwaPhone: "+919841099100",
      },
      {
        name: "Andheri Palms CHS",
        address: "Lokhandwala, Andheri West, Mumbai",
        city: "Mumbai",
        totalFlats: 80,
        totalBlocks: 2,
        plan: "pro" as const,
        mrr: 20000,
        upi: "andheripalms@oksbi",
        phone: "+912226780099",
        blocks: [
          { name: "Wing A", flats: 40, occupied: 37 },
          { name: "Wing B", flats: 40, occupied: 36 },
        ],
        residents: [
          { name: "Rohit Malhotra", flat: "WA-101", phone: "+919820001001", email: "rohit.m@email.com", ft: "2BHK" },
          { name: "Prachi Kapoor", flat: "WA-102", phone: "+919820001002", email: "prachi.k@email.com", ft: "2BHK" },
          { name: "Ajay Thakur", flat: "WA-201", phone: "+919820001003", email: "ajay.t@email.com", ft: "3BHK" },
          { name: "Sunita Bhatia", flat: "WA-301", phone: "+919820001004", email: "sunita.b@email.com", ft: "2BHK" },
          { name: "Vikrant Rane", flat: "WA-401", phone: "+919820001005", email: "vikrant.r@email.com", ft: "3BHK" },
          { name: "Manisha Sawant", flat: "WB-101", phone: "+919820001006", email: "manisha.s@email.com", ft: "2BHK" },
          { name: "Gaurav Bhosale", flat: "WB-102", phone: "+919820001007", email: "gaurav.b@email.com", ft: "2BHK" },
          { name: "Deepika Patkar", flat: "WB-201", phone: "+919820001008", email: "deepika.p@email.com", ft: "3BHK" },
          { name: "Sunil Doshi", flat: "WB-301", phone: "+919820001009", email: "sunil.d@email.com", ft: "2BHK" },
          { name: "Rekha Gawande", flat: "WB-401", phone: "+919820001010", email: "rekha.g@email.com", ft: "2BHK" },
          { name: "Pratik Pawar", flat: "WA-501", phone: "+919820001011", email: "pratik.p@email.com", ft: "3BHK" },
          { name: "Asha Kambli", flat: "WB-501", phone: "+919820001012", email: "asha.k@email.com", ft: "2BHK" },
        ],
        rwaName: "Milind Joshi",
        rwaEmail: "milind.rwa@andheripalms.in",
        rwaPhone: "+919820099100",
      },
      {
        name: "Cyber Meadows",
        address: "Gachibowli, Hyderabad",
        city: "Hyderabad",
        totalFlats: 200,
        totalBlocks: 4,
        plan: "enterprise" as const,
        mrr: 60000,
        upi: "cybermeadows@okaxis",
        phone: "+914040112233",
        blocks: [
          { name: "Block 1", flats: 50, occupied: 48 },
          { name: "Block 2", flats: 50, occupied: 47 },
          { name: "Block 3", flats: 50, occupied: 46 },
          { name: "Block 4", flats: 50, occupied: 45 },
        ],
        residents: [
          { name: "Srinivas Rao", flat: "B1-101", phone: "+919848001001", email: "srini.r@email.com", ft: "3BHK" },
          { name: "Padma Latha", flat: "B1-102", phone: "+919848001002", email: "padma.l@email.com", ft: "2BHK" },
          { name: "Ravi Teja", flat: "B1-201", phone: "+919848001003", email: "ravi.t@email.com", ft: "3BHK" },
          { name: "Swapna Reddy", flat: "B1-301", phone: "+919848001004", email: "swapna.r@email.com", ft: "2BHK" },
          { name: "Krishna Murthy", flat: "B2-101", phone: "+919848001005", email: "krishna.m@email.com", ft: "2BHK" },
          { name: "Sarita Rao", flat: "B2-102", phone: "+919848001006", email: "sarita.r@email.com", ft: "3BHK" },
          { name: "Nagarjuna P", flat: "B2-201", phone: "+919848001007", email: "naga.p@email.com", ft: "2BHK" },
          { name: "Hymavathi K", flat: "B3-101", phone: "+919848001008", email: "hyma.k@email.com", ft: "2BHK" },
          { name: "Suresh Babu", flat: "B3-201", phone: "+919848001009", email: "suresh.b@email.com", ft: "3BHK" },
          { name: "Lakshmi Prasad", flat: "B3-301", phone: "+919848001010", email: "lakshmi.p@email.com", ft: "2BHK" },
          { name: "Vamsi Krishna", flat: "B4-101", phone: "+919848001011", email: "vamsi.k@email.com", ft: "3BHK" },
          { name: "Rajyalakshmi D", flat: "B4-201", phone: "+919848001012", email: "rajya.d@email.com", ft: "2BHK" },
          { name: "Hari Prasad N", flat: "B1-401", phone: "+919848001013", email: "hari.n@email.com", ft: "2BHK" },
          { name: "Sujatha T", flat: "B2-401", phone: "+919848001014", email: "sujatha.t@email.com", ft: "3BHK" },
          { name: "Chandrasekhar M", flat: "B4-301", phone: "+919848001015", email: "chandra.m@email.com", ft: "2BHK" },
          { name: "Radhika Venkat", flat: "B3-401", phone: "+919848001016", email: "radhika.v@email.com", ft: "2BHK" },
        ],
        rwaName: "Venkatesh Reddy",
        rwaEmail: "venkat.rwa@cybermeadows.in",
        rwaPhone: "+919848099100",
      },
      {
        name: "Salt Lake Greens",
        address: "Sector V, Salt Lake, Kolkata",
        city: "Kolkata",
        totalFlats: 72,
        totalBlocks: 2,
        plan: "basic" as const,
        mrr: 7200,
        upi: "saltlakegreens@okaxis",
        phone: "+913322770088",
        blocks: [
          { name: "Block 1", flats: 36, occupied: 32 },
          { name: "Block 2", flats: 36, occupied: 30 },
        ],
        residents: [
          { name: "Subhash Chatterjee", flat: "B1-101", phone: "+919830001001", email: "subhash.c@email.com", ft: "2BHK" },
          { name: "Mala Banerjee", flat: "B1-102", phone: "+919830001002", email: "mala.b@email.com", ft: "2BHK" },
          { name: "Tapan Ghosh", flat: "B1-201", phone: "+919830001003", email: "tapan.g@email.com", ft: "3BHK" },
          { name: "Rituparna Sen", flat: "B1-301", phone: "+919830001004", email: "rituparna.s@email.com", ft: "2BHK" },
          { name: "Kaushik Bose", flat: "B2-101", phone: "+919830001005", email: "kaushik.b@email.com", ft: "2BHK" },
          { name: "Sreemoyee Das", flat: "B2-102", phone: "+919830001006", email: "sreemoyee.d@email.com", ft: "3BHK" },
          { name: "Amitabha Roy", flat: "B2-201", phone: "+919830001007", email: "amitabha.r@email.com", ft: "2BHK" },
          { name: "Swati Mukhopadhyay", flat: "B2-301", phone: "+919830001008", email: "swati.m@email.com", ft: "2BHK" },
          { name: "Debashis Pal", flat: "B1-401", phone: "+919830001009", email: "debashis.p@email.com", ft: "3BHK" },
          { name: "Ananya Chakraborty", flat: "B2-401", phone: "+919830001010", email: "ananya.c@email.com", ft: "2BHK" },
        ],
        rwaName: "Soumitra Dutta",
        rwaEmail: "soumitra.rwa@saltlakegreens.in",
        rwaPhone: "+919830099100",
      },
      {
        name: "DLF Garden City",
        address: "Sector 91, Gurugram",
        city: "Gurugram",
        totalFlats: 160,
        totalBlocks: 3,
        plan: "enterprise" as const,
        mrr: 48000,
        upi: "dlfgardencity@okhdfc",
        phone: "+911244556677",
        blocks: [
          { name: "Magnolia", flats: 56, occupied: 54 },
          { name: "Jasmine", flats: 56, occupied: 52 },
          { name: "Lotus", flats: 48, occupied: 46 },
        ],
        residents: [
          { name: "Ashok Verma", flat: "M-101", phone: "+919810001001", email: "ashok.v@email.com", ft: "3BHK" },
          { name: "Ritu Gupta", flat: "M-102", phone: "+919810001002", email: "ritu.g@email.com", ft: "2BHK" },
          { name: "Sandeep Arora", flat: "M-201", phone: "+919810001003", email: "sandeep.a@email.com", ft: "3BHK" },
          { name: "Preeti Mathur", flat: "M-301", phone: "+919810001004", email: "preeti.m@email.com", ft: "4BHK" },
          { name: "Manoj Aggarwal", flat: "J-101", phone: "+919810001005", email: "manoj.a@email.com", ft: "3BHK" },
          { name: "Shalini Khanna", flat: "J-102", phone: "+919810001006", email: "shalini.k@email.com", ft: "2BHK" },
          { name: "Vivek Singhal", flat: "J-201", phone: "+919810001007", email: "vivek.s@email.com", ft: "3BHK" },
          { name: "Nidhi Sharma", flat: "J-301", phone: "+919810001008", email: "nidhi.s@email.com", ft: "2BHK" },
          { name: "Rajiv Tandon", flat: "L-101", phone: "+919810001009", email: "rajiv.t@email.com", ft: "4BHK" },
          { name: "Asha Mittal", flat: "L-102", phone: "+919810001010", email: "asha.mi@email.com", ft: "3BHK" },
          { name: "Deepak Chadha", flat: "L-201", phone: "+919810001011", email: "deepak.c@email.com", ft: "2BHK" },
          { name: "Kavita Bhatia", flat: "L-301", phone: "+919810001012", email: "kavita.bh@email.com", ft: "3BHK" },
          { name: "Sumit Walia", flat: "M-401", phone: "+919810001013", email: "sumit.w@email.com", ft: "2BHK" },
          { name: "Priyanka Sethi", flat: "J-401", phone: "+919810001014", email: "priyanka.se@email.com", ft: "3BHK" },
          { name: "Nitin Chopra", flat: "L-401", phone: "+919810001015", email: "nitin.ch@email.com", ft: "4BHK" },
        ],
        rwaName: "Anil Kapoor",
        rwaEmail: "anil.rwa@dlfgardencity.in",
        rwaPhone: "+919810099100",
      },
    ];

    const results: string[] = [];

    for (const soc of SOCIETIES) {
      const existing = await ctx.db
        .query("societies")
        .filter((q) => q.eq(q.field("name"), soc.name))
        .first();
      if (existing) { results.push(`${soc.name}: skipped`); continue; }

      const societyId = await ctx.db.insert("societies", {
        name: soc.name,
        address: soc.address,
        city: soc.city,
        totalFlats: soc.totalFlats,
        totalBlocks: soc.totalBlocks,
        subscriptionPlan: soc.plan,
        isActive: true,
        mrr: soc.mrr,
        helplinePhone: soc.phone,
        upiId: soc.upi,
        createdAt: now - Math.floor(Math.random() * 365 + 180) * DAY,
      });

      const blockIds: Id<"blocks">[] = [];
      for (const b of soc.blocks) {
        const bid = await ctx.db.insert("blocks", {
          societyId,
          name: b.name,
          type: b.flats > 45 ? "tower" : "block",
          totalFlats: b.flats,
          occupiedFlats: b.occupied,
          createdAt: now - 350 * DAY,
        });
        blockIds.push(bid);
        await ctx.db.insert("waterTanks", {
          societyId,
          blockId: bid,
          name: `Overhead Tank – ${b.name}`,
          type: "overhead",
          capacityKL: 50 + Math.round(b.flats / 10) * 5,
          currentLevelPct: 50 + Math.floor(Math.random() * 40),
          lastUpdated: now - Math.floor(Math.random() * 3) * HOUR,
        });
      }
      await ctx.db.insert("waterTanks", {
        societyId,
        blockId: blockIds[0],
        name: "Sump Tank",
        type: "sump",
        capacityKL: 120,
        currentLevelPct: 60 + Math.floor(Math.random() * 30),
        lastUpdated: now,
      });

      // RWA manager
      const rwaId = await ctx.db.insert("users", {
        societyId,
        blockId: blockIds[0],
        defaultBlockId: blockIds[0],
        name: soc.rwaName,
        email: soc.rwaEmail,
        phone: soc.rwaPhone,
        role: "rwa",
        isActive: true,
        onboardingComplete: true,
        createdAt: now - 400 * DAY,
      });

      // Residents
      for (const r of soc.residents) {
        const blockPrefix = r.flat.split("-")[0];
        const blockIdx = soc.blocks.findIndex((b) =>
          b.name.toUpperCase().startsWith(blockPrefix.toUpperCase()) ||
          b.name.replace(/\s+/g, "").toUpperCase() === blockPrefix.toUpperCase()
        );
        const blockId = blockIds[Math.max(blockIdx, 0)];
        await ctx.db.insert("users", {
          societyId,
          blockId,
          defaultBlockId: blockId,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: "resident",
          flatNumber: r.flat,
          flatType: r.ft,
          isActive: true,
          moveInDate: now - Math.floor(Math.random() * 600 + 100) * DAY,
          notifInApp: true,
          notifWhatsapp: true,
          onboardingComplete: true,
          createdAt: now - 300 * DAY,
        });
      }

      // Maintenance charges
      await ctx.db.insert("maintenanceCharges", { societyId, flatType: "2BHK", monthlyAmount: soc.plan === "enterprise" ? 5500 : 3500, dueDay: 5, lateFeeAmount: 200, lateFeeType: "flat", effectiveFrom: now - 180 * DAY });
      await ctx.db.insert("maintenanceCharges", { societyId, flatType: "3BHK", monthlyAmount: soc.plan === "enterprise" ? 8000 : 5000, dueDay: 5, lateFeeAmount: 300, lateFeeType: "flat", effectiveFrom: now - 180 * DAY });
      if (soc.plan === "enterprise") {
        await ctx.db.insert("maintenanceCharges", { societyId, flatType: "4BHK", monthlyAmount: 12000, dueDay: 5, lateFeeAmount: 500, lateFeeType: "flat", effectiveFrom: now - 180 * DAY });
      }

      // Vendors
      await ctx.db.insert("vendors", { societyId, name: "City Water Tankers", type: "water_tanker", phone: "+919000010001", ratePerUnit: 1300, unit: "KL", isPreferred: true, isActive: true, rating: 4, totalJobs: 20 });
      await ctx.db.insert("vendors", { societyId, name: "Reliable Diesel Supply", type: "diesel", phone: "+919000010002", ratePerUnit: 93, unit: "L", isPreferred: true, isActive: true, rating: 5, totalJobs: 30 });
      await ctx.db.insert("vendors", { societyId, name: "Metro Waste Management", type: "garbage", phone: "+919000010003", isPreferred: true, isActive: true, rating: 4, totalJobs: 120 });
      await ctx.db.insert("vendors", { societyId, name: "QuickFix Plumbing", type: "plumbing", phone: "+919000010004", isPreferred: true, isActive: true, rating: 3, totalJobs: 18 });

      // Staff
      const STAFF_NAMES = ["Raju S", "Mohan L", "Sundar V", "Kavitha P", "Bharat K"];
      const STAFF_ROLES = ["Security Guard", "Housekeeping", "Security Guard", "Garden Maintenance", "Electrician"];
      const STAFF_SHIFTS = ["morning", "full_day", "night", "morning", "full_day"] as const;
      const staffIds: Id<"staff">[] = [];
      for (let si = 0; si < STAFF_NAMES.length; si++) {
        const sid = await ctx.db.insert("staff", {
          societyId,
          name: STAFF_NAMES[si],
          role: STAFF_ROLES[si],
          phone: `+9190000${20000 + si}`,
          shift: STAFF_SHIFTS[si],
          isOnDuty: si % 2 === 0,
          lastAttendanceAt: now - (si % 2 === 0 ? HOUR : 14 * HOUR),
          createdAt: now - 200 * DAY,
        });
        staffIds.push(sid);
      }

      // Payments (3 months for first 8 residents)
      const residentDocs = await ctx.db.query("users").withIndex("by_society", (q) => q.eq("societyId", societyId)).collect();
      const resOnly = residentDocs.filter((u) => u.role === "resident").slice(0, 8);
      for (const res of resOnly) {
        const amt = res.flatType === "4BHK" ? 12000 : res.flatType === "3BHK" ? (soc.plan === "enterprise" ? 8000 : 5000) : (soc.plan === "enterprise" ? 5500 : 3500);
        for (let m = 1; m <= 3; m++) {
          const due = now - m * 30 * DAY;
          await ctx.db.insert("payments", {
            societyId,
            blockId: res.blockId!,
            residentId: res._id,
            type: "monthly_maintenance",
            description: `Maintenance – Month ${4 - m}`,
            amount: amt,
            dueDate: due,
            status: "confirmed",
            paidAt: due + 2 * DAY,
            paymentMethod: ["upi", "bank_transfer", "online"][m % 3] as any,
            confirmedBy: rwaId,
            createdAt: due - 5 * DAY,
          });
        }
      }

      // Broadcasts
      await ctx.db.insert("broadcasts", {
        societyId,
        blockId: blockIds[0],
        title: "Welcome to BlockSense!",
        message: "Your society is now live on BlockSense. Explore the dashboard to manage utilities, payments, and more.",
        type: "info",
        targetAudience: "all_residents",
        channels: ["in_app"],
        sentBy: rwaId,
        sentCount: 0,
        sentAt: now - 10 * DAY,
        createdAt: now - 10 * DAY,
      });
      await ctx.db.insert("broadcasts", {
        societyId,
        blockId: blockIds[0],
        title: "Maintenance Due Reminder",
        message: "Monthly maintenance charges are due on the 5th. Please pay via UPI or bank transfer to avoid late fees.",
        type: "info",
        targetAudience: "all_residents",
        channels: ["in_app", "whatsapp"],
        sentBy: rwaId,
        sentCount: 0,
        sentAt: now - 3 * DAY,
        createdAt: now - 3 * DAY,
      });

      // 30 days of water readings
      for (let d = 29; d >= 0; d--) {
        const ts = now - d * DAY;
        await ctx.db.insert("waterReadings", {
          societyId,
          blockId: blockIds[0],
          source: "borewell",
          readingType: "consumption",
          value: Math.round((8 + Math.random() * 4) * 10) / 10,
          unit: "kl",
          recordedBy: rwaId,
          recordedAt: ts,
        });
      }

      // Alerts
      await ctx.db.insert("alerts", {
        societyId,
        blockId: blockIds[0],
        utility: "water",
        alertType: "threshold",
        severity: "warning",
        title: "Low Water Tank Level",
        message: "Water tank level below 30% in overhead tank. Consider ordering tanker.",
        triggeredAt: now - 2 * DAY,
        isResolved: false,
      });

      results.push(`${soc.name}: seeded (${soc.residents.length} residents)`);
    }

    return { results };
  },
});

export const wipeDemoNamedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete ALL anonymous demo session users: no email, no onboardingComplete,
    // created via the demo login button. Keep only real seeded residents (have email).
    const all = await ctx.db.query("users").collect();
    let deleted = 0;
    for (const u of all) {
      const isDemoSession =
        !u.email &&
        !u.onboardingComplete &&
        (u.isAnonymous === true || !u.email);
      if (isDemoSession) {
        await ctx.db.delete(u._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const wipeDemoNamedUsersInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    let deleted = 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const u of all) {
      // Only delete anonymous demo sessions: no email, no onboarding, AND created
      // more than 24 hours ago (protects users in the middle of onboarding)
      const isDemoSession =
        !u.email &&
        !u.onboardingComplete &&
        u.isAnonymous === true &&
        (u.createdAt ?? 0) < oneDayAgo;
      if (isDemoSession) {
        await ctx.db.delete(u._id);
        deleted++;
      }
    }
    return { deleted };
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
