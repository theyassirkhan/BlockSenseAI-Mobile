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

// Public version (platform admin + society admin queries)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!caller || (caller.role !== "admin" && caller.role !== "platform_admin")) {
      throw new Error("Forbidden: only admins can list all societies");
    }
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
