import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getInternal = internalQuery({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => ctx.db.get(args.societyId),
});

// Internal version (for crons/actions)
export const listAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("societies").collect(),
});

// Public version (platform admin queries)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.query("societies").collect();
  },
});

// Internal version (for crons/actions)
export const getBlocksInternal = internalQuery({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) =>
    ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect(),
});

// Public version
export const getBlocks = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("blocks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});
