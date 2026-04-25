import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

function generatePassCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Gatepass delivery ─────────────────────────────────────────────────────

export const sendGatepass = internalAction({
  args: {
    visitorPhone: v.string(),
    visitorName: v.string(),
    residentName: v.string(),
    flatNumber: v.string(),
    passCode: v.string(),
    expectedAt: v.number(),
    societyName: v.string(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://blocksense-ai.vercel.app";
    const gatepassUrl = `${appUrl}/gatepass/${args.passCode}`;

    const expectedTime = new Date(args.expectedAt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const msg =
      `🏢 *BlockSense AI – Gate Pass*\n\n` +
      `Hi *${args.visitorName}*,\n` +
      `You've been invited to *${args.societyName}*.\n\n` +
      `📍 Flat: *${args.flatNumber}* (${args.residentName})\n` +
      `⏰ Expected: *${expectedTime}*\n` +
      `🔑 Pass Code: *${args.passCode}*\n\n` +
      `Show this gate pass QR to the security guard:\n${gatepassUrl}\n\n` +
      `_Powered by BlockSense AI_`;

    const phone = args.visitorPhone.replace(/\D/g, "");
    const apiKey = process.env.MSG91_API_KEY;

    // WhatsApp via MSG91
    const waNumber = process.env.MSG91_WHATSAPP_NUMBER;
    if (apiKey && waNumber) {
      await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: apiKey },
        body: JSON.stringify({
          integrated_number: waNumber,
          content_type: "template",
          payload: {
            to: [{ user_whatsapp_number: phone }],
            type: "template",
            template: {
              name: "visitor_gatepass",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: args.visitorName },
                    { type: "text", text: args.societyName },
                    { type: "text", text: args.flatNumber },
                    { type: "text", text: args.residentName },
                    { type: "text", text: expectedTime },
                    { type: "text", text: args.passCode },
                    { type: "text", text: gatepassUrl },
                  ],
                },
              ],
            },
          },
        }),
      }).catch(() => {});
    }

    // SMS fallback via MSG91
    if (apiKey) {
      const smsText = `BlockSense Gate Pass for ${args.societyName}. Pass: ${args.passCode}. Expected: ${expectedTime}. QR: ${gatepassUrl}`;
      await fetch(
        `https://api.msg91.com/api/v5/flow/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", authkey: apiKey },
          body: JSON.stringify({
            flow_id: process.env.MSG91_SMS_FLOW_ID ?? "",
            sender: "BLKSEN",
            mobiles: `91${phone}`,
            VAR1: args.visitorName,
            VAR2: args.passCode,
            VAR3: gatepassUrl,
          }),
        }
      ).catch(() => {});
    }

    // Mark sent in DB
    await ctx.runMutation(internal.visitors.markGatepassSent, { passCode: args.passCode });
  },
});

export const markGatepassSent = internalMutation({
  args: { passCode: v.string() },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .filter(q => q.eq(q.field("passCode"), args.passCode))
      .first();
    if (visitor) await ctx.db.patch(visitor._id, { gatepassSent: true });
  },
});

// Notify resident when guest checks in
export const notifyResidentCheckIn = internalAction({
  args: {
    residentId: v.id("users"),
    visitorName: v.string(),
    checkedInAt: v.number(),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.runQuery(internal.users.getById, { userId: args.residentId });
    if (!resident) return;

    const time = new Date(args.checkedInAt).toLocaleString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const msg =
      `✅ *BlockSense AI – Guest Arrived*\n\n` +
      `Hi *${resident.name}*,\n` +
      `*${args.visitorName}* has been checked in at the gate at *${time}* and is on the way to your flat.\n\n` +
      `_Powered by BlockSense AI_`;

    const apiKey = process.env.MSG91_API_KEY;
    const waNumber = process.env.MSG91_WHATSAPP_NUMBER;

    // Email fallback — always attempt if resident has email
    if (resident.email) {
      await ctx.runAction(internal.email.sendVisitorArrivalEmail, {
        residentEmail: resident.email,
        residentName: resident.name ?? "Resident",
        visitorName: args.visitorName,
        visitorPhone: "",
        flatNumber: resident.flatNumber ?? "",
        societyName: "your society",
      }).catch(() => {});
    }

    if (resident.whatsapp && apiKey && waNumber) {
      const phone = resident.whatsapp.replace(/\D/g, "");
      await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: apiKey },
        body: JSON.stringify({
          integrated_number: waNumber,
          content_type: "template",
          payload: {
            to: [{ user_whatsapp_number: phone }],
            type: "template",
            template: {
              name: "visitor_checkin_resident",
              language: { code: "en" },
              components: [{
                type: "body",
                parameters: [
                  { type: "text", text: resident.name },
                  { type: "text", text: args.visitorName },
                  { type: "text", text: time },
                ],
              }],
            },
          },
        }),
      }).catch(() => {});
    }
  },
});

// ── Public mutations & queries ────────────────────────────────────────────

export const register = mutation({
  args: {
    societyId: v.id("societies"),
    visitorName: v.string(),
    visitorPhone: v.string(),
    expectedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");

    const society = await ctx.db.get(args.societyId);
    const passCode = generatePassCode();

    const visitorId = await ctx.db.insert("visitors", {
      ...args,
      registeredBy: user._id,
      passCode,
      createdAt: Date.now(),
    });

    // Send gatepass in background
    await ctx.scheduler.runAfter(0, internal.visitors.sendGatepass, {
      visitorPhone: args.visitorPhone,
      visitorName: args.visitorName,
      residentName: user.name ?? "Resident",
      flatNumber: user.flatNumber ?? "—",
      passCode,
      expectedAt: args.expectedAt,
      societyName: society?.name ?? "Society",
    });

    return { visitorId, passCode };
  },
});

export const getMyVisitors = query({
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
      .query("visitors")
      .withIndex("by_resident", (q) =>
        q.eq("societyId", args.societyId).eq("registeredBy", user._id)
      )
      .order("desc")
      .take(20);
  },
});

export const getByPassCode = query({
  args: { passCode: v.string() },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .filter(q => q.eq(q.field("passCode"), args.passCode))
      .first();
    if (!visitor) return null;
    const resident = await ctx.db.get(visitor.registeredBy);
    const society = await ctx.db.get(visitor.societyId);
    return {
      ...visitor,
      residentName: resident?.name ?? "—",
      flatNumber: resident?.flatNumber ?? "—",
      societyName: society?.name ?? "Society",
    };
  },
});

export const checkIn = mutation({
  args: { visitorId: v.id("visitors") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const visitor = await ctx.db.get(args.visitorId);
    if (!visitor) throw new Error("Visitor not found");
    const now = Date.now();
    await ctx.db.patch(args.visitorId, { checkedInAt: now });

    // Only notify if registered by a resident (not a guard walk-in)
    const registrar = await ctx.db.get(visitor.registeredBy);
    if (registrar?.role === "resident") {
      await ctx.scheduler.runAfter(0, internal.visitors.notifyResidentCheckIn, {
        residentId: visitor.registeredBy,
        visitorName: visitor.visitorName,
        checkedInAt: now,
      });
    }
  },
});

export const checkOut = mutation({
  args: { visitorId: v.id("visitors") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.visitorId, { checkedOutAt: Date.now() });
  },
});

// ── Guard PWA mutations ───────────────────────────────────────────────────

export const lookupByPassCode = query({
  args: { societyId: v.id("societies"), passCode: v.string() },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_society", q => q.eq("societyId", args.societyId))
      .filter(q => q.eq(q.field("passCode"), args.passCode))
      .first();
    if (!visitor) return null;
    const resident = await ctx.db.get(visitor.registeredBy);
    return { ...visitor, residentName: resident?.name, flatNumber: resident?.flatNumber };
  },
});

export const walkInEntry = mutation({
  args: {
    societyId: v.id("societies"),
    visitorName: v.string(),
    visitorPhone: v.string(),
    purposeFlat: v.string(),
    vehicleNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const guard = await ctx.db
      .query("users")
      .withIndex("by_token", q => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!guard) throw new Error("Profile not found");
    const now = Date.now();
    return ctx.db.insert("visitors", {
      societyId: args.societyId,
      registeredBy: guard._id,
      visitorName: args.visitorName,
      visitorPhone: args.visitorPhone,
      expectedAt: now,
      passCode: generatePassCode(),
      checkedInAt: now,
      createdAt: now,
    });
  },
});

export const getTodayLog = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_society", q => q.eq("societyId", args.societyId))
      .filter(q => q.gte(q.field("createdAt"), dayStart.getTime()))
      .order("desc")
      .take(100);
    return visitors;
  },
});

export const getHistory = query({
  args: { societyId: v.id("societies"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_society", q => q.eq("societyId", args.societyId))
      .order("desc")
      .take(args.limit ?? 50);
    return Promise.all(visitors.map(async v => {
      const resident = await ctx.db.get(v.registeredBy);
      return { ...v, residentName: resident?.name ?? "—", flatNumber: resident?.flatNumber ?? "—" };
    }));
  },
});
