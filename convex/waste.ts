import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const logWaste = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    dryWasteKG: v.number(),
    wetWasteKG: v.number(),
    segregationOk: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    return ctx.db.insert("wasteLogs", {
      ...args,
      totalKG: args.dryWasteKG + args.wetWasteKG,
      loggedBy: user._id,
      loggedAt: Date.now(),
    });
  },
});

export const getRecentLogs = query({
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
      .query("wasteLogs")
      .withIndex("by_logged_at", (q) =>
        q
          .eq("societyId", args.societyId)
          .eq("blockId", args.blockId)
          .gte("loggedAt", since)
      )
      .order("desc")
      .collect();
  },
});

export const getComplianceLeaderboard = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();

    const leaderboard = await Promise.all(
      blocks.map(async (block) => {
        const logs = await ctx.db
          .query("wasteLogs")
          .withIndex("by_logged_at", (q) =>
            q
              .eq("societyId", args.societyId)
              .eq("blockId", block._id)
              .gte("loggedAt", since)
          )
          .collect();
        const totalLogs = logs.length;
        const compliantLogs = logs.filter((l) => l.segregationOk).length;
        const compliancePct =
          totalLogs > 0 ? Math.round((compliantLogs / totalLogs) * 100) : 0;
        const totalKG = logs.reduce((s, l) => s + l.totalKG, 0);
        return {
          blockId: block._id,
          blockName: block.name,
          compliancePct,
          totalKG: Math.round(totalKG * 10) / 10,
          totalLogs,
        };
      })
    );

    return leaderboard.sort((a, b) => b.compliancePct - a.compliancePct);
  },
});
