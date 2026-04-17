import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getWeek = query({
  args: { societyId: v.id("societies"), weekStart: v.number() },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("shifts")
      .withIndex("by_date", (q) =>
        q.eq("societyId", args.societyId).gte("date", args.weekStart)
      )
      .filter((q) => q.lt(q.field("date"), weekEnd))
      .collect();
  },
});

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    staffId: v.id("users"),
    blockId: v.optional(v.id("blocks")),
    date: v.number(),
    shiftType: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("night")
    ),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("shifts", {
      ...args,
      status: "scheduled",
    });
  },
});

export const markAttendance = mutation({
  args: {
    shiftId: v.id("shifts"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("half_day"),
      v.literal("leave")
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    await ctx.db.patch(args.shiftId, {
      status: args.status,
      markedBy: user?._id,
      markedAt: Date.now(),
    });
  },
});
