import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const scheduleCollection = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    vendorId: v.id("vendors"),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("garbageCollectionLog", {
      ...args,
      status: "pending",
    });
  },
});

export const confirmCollection = mutation({
  args: {
    logId: v.id("garbageCollectionLog"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    await ctx.db.patch(args.logId, {
      status: "collected",
      collectedAt: Date.now(),
      confirmedBy: user?._id,
      notes: args.notes,
    });
  },
});

export const rescheduleCollection = mutation({
  args: {
    logId: v.id("garbageCollectionLog"),
    newScheduledAt: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.logId, {
      status: "rescheduled",
      scheduledAt: args.newScheduledAt,
      notes: args.notes,
    });
  },
});

export const getSchedule = query({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const until = Date.now() + (args.days ?? 14) * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("garbageCollectionLog")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledAt"), since),
          q.lte(q.field("scheduledAt"), until)
        )
      )
      .order("asc")
      .collect();
  },
});

export const getMissed = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("garbageCollectionLog")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .filter((q) => q.eq(q.field("status"), "missed"))
      .order("desc")
      .take(10);
  },
});

export const checkMissedCollections = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Full scan for pending entries — no cross-society index available
    const pending = await ctx.db
      .query("garbageCollectionLog")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Mark all overdue pending as missed
    for (const log of pending) {
      if (log.scheduledAt < now - 2 * 60 * 60 * 1000) {
        await ctx.db.patch(log._id, { status: "missed" });
        await ctx.db.insert("alerts", {
          societyId: log.societyId,
          blockId: log.blockId,
          utility: "garbage",
          alertType: "threshold",
          severity: "warning",
          title: "Garbage collection missed",
          message: `Scheduled collection on ${new Date(log.scheduledAt).toLocaleDateString()} was missed.`,
          metadata: { logId: log._id },
          isResolved: false,
          triggeredAt: now,
        });
      }
    }
  },
});
