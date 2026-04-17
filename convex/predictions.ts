import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const runAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const societies = await ctx.db.query("societies").collect();
    for (const society of societies) {
      const blocks = await ctx.db
        .query("blocks")
        .withIndex("by_society", (q) => q.eq("societyId", society._id))
        .collect();
      for (const block of blocks) {
        await ctx.scheduler.runAfter(
          0,
          internal.alerts.checkWaterThresholds,
          { societyId: society._id, blockId: block._id }
        );
        await ctx.scheduler.runAfter(
          0,
          internal.alerts.checkPowerThresholds,
          { societyId: society._id, blockId: block._id }
        );
        await ctx.scheduler.runAfter(
          0,
          internal.alerts.checkGasThresholds,
          { societyId: society._id, blockId: block._id }
        );
        await ctx.scheduler.runAfter(
          0,
          internal.alerts.checkSewageThresholds,
          { societyId: society._id, blockId: block._id }
        );
      }
    }
  },
});

export const getLog = query({
  args: { societyId: v.id("societies"), blockId: v.id("blocks") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("predictionLog")
      .withIndex("by_block", (q) =>
        q.eq("societyId", args.societyId).eq("blockId", args.blockId)
      )
      .order("desc")
      .take(20);
  },
});
