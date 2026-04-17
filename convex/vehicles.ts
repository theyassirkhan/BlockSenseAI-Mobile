import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMyVehicles = query({
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
      .query("vehicles")
      .withIndex("by_resident", (q) =>
        q.eq("societyId", args.societyId).eq("residentId", user._id)
      )
      .collect();
  },
});

export const add = mutation({
  args: {
    societyId: v.id("societies"),
    vehicleNumber: v.string(),
    type: v.union(v.literal("car"), v.literal("bike"), v.literal("other")),
    parkingSlot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("Profile not found");
    return ctx.db.insert("vehicles", {
      ...args,
      residentId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.delete(args.vehicleId);
  },
});
