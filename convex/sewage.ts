import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const addReading = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    stpStatus: v.union(
      v.literal("normal"),
      v.literal("maintenance"),
      v.literal("fault"),
      v.literal("offline")
    ),
    sludgeTankPct: v.number(),
    treatedTankPct: v.number(),
    inflowRateLPH: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    const id = await ctx.db.insert("sewageReadings", {
      ...args,
      recordedBy: user._id,
      recordedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.alerts.checkSewageThresholds, {
      societyId: args.societyId,
      blockId: args.blockId,
    });
    return id;
  },
});

export const getLatest = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("sewageReadings")
      .withIndex("by_recorded_at", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .first();
  },
});

export const getReadings = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const since = Date.now() - (args.days ?? 30) * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("sewageReadings")
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
