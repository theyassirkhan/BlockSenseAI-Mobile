import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    name: v.string(),
    type: v.union(
      v.literal("water_tanker"),
      v.literal("diesel"),
      v.literal("gas"),
      v.literal("desludge"),
      v.literal("waste_pickup"),
      v.literal("garbage"),
      v.literal("electrical"),
      v.literal("plumbing"),
      v.literal("other")
    ),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    ratePerUnit: v.optional(v.number()),
    unit: v.optional(v.string()),
    isPreferred: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("vendors", args);
  },
});

export const getBySociety = query({
  args: {
    societyId: v.id("societies"),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
    if (args.type) return vendors.filter((v) => v.type === args.type);
    return vendors;
  },
});

export const getById = internalQuery({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => ctx.db.get(args.vendorId),
});

export const update = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    ratePerUnit: v.optional(v.number()),
    unit: v.optional(v.string()),
    isPreferred: v.optional(v.boolean()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { vendorId, ...patch } = args;
    await ctx.db.patch(vendorId, patch);
  },
});

export const remove = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.delete(args.vendorId);
  },
});

// Alias used by the RWA vendors page
export const add = mutation({
  args: {
    societyId: v.id("societies"),
    name: v.string(),
    type: v.union(
      v.literal("water_tanker"),
      v.literal("diesel"),
      v.literal("gas"),
      v.literal("desludge"),
      v.literal("waste_pickup"),
      v.literal("garbage"),
      v.literal("electrical"),
      v.literal("plumbing"),
      v.literal("other")
    ),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    ratePerUnit: v.optional(v.number()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("vendors", { ...args, isPreferred: false, isActive: true });
  },
});

export const setActive = mutation({
  args: { vendorId: v.id("vendors"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.vendorId, { isActive: args.isActive });
  },
});
