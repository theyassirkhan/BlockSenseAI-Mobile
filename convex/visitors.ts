import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function generatePassCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const register = mutation({
  args: {
    societyId: v.id("societies"),
    visitorName: v.string(),
    visitorPhone: v.string(),
    expectedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    const passCode = generatePassCode();

    const visitorId = await ctx.db.insert("visitors", {
      societyId: args.societyId,
      registeredBy: user._id,
      visitorName: args.visitorName,
      visitorPhone: args.visitorPhone,
      expectedAt: args.expectedAt,
      passCode,
      gatepassSent: true,
      createdAt: Date.now(),
    } as any);

    return { passCode, visitorId };
  },
});

export const getMyVisitors = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) return [];

    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    return visitors
      .filter((v) => v.registeredBy === user._id)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

// Used by the public gate pass display page — no auth required
export const getByPassCode = query({
  args: { passCode: v.string() },
  handler: async (ctx, args) => {
    const visitors = await ctx.db.query("visitors").collect();
    const visitor = visitors.find((v) => v.passCode === args.passCode);
    if (!visitor) return null;

    const resident = await ctx.db.get(visitor.registeredBy as any);
    const society = await ctx.db.get(visitor.societyId);

    return {
      ...visitor,
      residentName: (resident as any)?.name ?? null,
      flatNumber: (resident as any)?.flatNumber ?? null,
      societyName: (society as any)?.name ?? null,
    };
  },
});

export const getTodayLog = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    return ctx.db
      .query("visitors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .filter((q) => q.gte(q.field("createdAt"), dayStart.getTime()))
      .collect();
  },
});

export const getHistory = query({
  args: { societyId: v.id("societies"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("visitors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(args.limit ?? 100);

    const enriched = await Promise.all(
      rows.map(async (v) => {
        const resident = await ctx.db.get(v.registeredBy as any);
        return {
          ...v,
          residentName: (resident as any)?.name ?? null,
          flatNumber: (resident as any)?.flatNumber ?? null,
        };
      })
    );
    return enriched;
  },
});

export const checkIn = mutation({
  args: { visitorId: v.id("visitors") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.visitorId, { checkedInAt: Date.now() } as any);
  },
});

export const checkOut = mutation({
  args: { visitorId: v.id("visitors") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.visitorId, { checkedOutAt: Date.now() } as any);
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
    if (!authId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    const passCode = generatePassCode();
    const now = Date.now();

    return ctx.db.insert("visitors", {
      societyId: args.societyId,
      registeredBy: user._id,
      visitorName: args.visitorName,
      visitorPhone: args.visitorPhone,
      expectedAt: now,
      passCode,
      purposeFlat: args.purposeFlat,
      vehicleNumber: args.vehicleNumber,
      checkedInAt: now,
      createdAt: now,
    } as any);
  },
});

// Used by guard scan — societyId scopes the search for efficiency
export const lookupByPassCode = query({
  args: { societyId: v.id("societies"), passCode: v.string() },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .filter((q) => q.eq(q.field("passCode"), args.passCode))
      .first();
    if (!visitor) return null;

    const resident = await ctx.db.get(visitor.registeredBy as any);

    return {
      ...visitor,
      residentName: (resident as any)?.name ?? null,
      flatNumber: (resident as any)?.flatNumber ?? null,
    };
  },
});
