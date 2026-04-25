import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId as any);
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return null;
    const authUser = await ctx.db.get(authId as any);
    if (!authUser) return null;
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", authUser._id as string)
      )
      .first();
    return profile;
  },
});

export const createProfile = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("rwa"), v.literal("resident"), v.literal("guard"), v.literal("staff")),
    societyId: v.optional(v.id("societies")),
    blockId: v.optional(v.id("blocks")),
    flatNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (existing) return existing._id;

    // Prevent privilege escalation: admin role requires no existing admin for that society
    if (args.role === "admin" && args.societyId) {
      const existingAdmin = await ctx.db
        .query("users")
        .withIndex("by_society", (q) => q.eq("societyId", args.societyId!))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .first();
      if (existingAdmin) throw new Error("This society already has an admin. Contact your society admin to get access.");
    }

    return ctx.db.insert("users", {
      ...args,
      isActive: true,
      tokenIdentifier: authId as string,
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    flatNumber: v.optional(v.string()),
    blockId: v.optional(v.id("blocks")),
    defaultBlockId: v.optional(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, args);
    return profile._id;
  },
});

export const getBySociety = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("users")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});

export const getRWAMembers = internalQuery({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
    return members.filter(
      (m) => m.role === "rwa" || m.role === "admin"
    );
  },
});

export const setActiveSociety = mutation({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, { societyId: args.societyId });
  },
});

export const completeOnboarding = mutation({
  args: {
    whatsapp: v.string(),
    whatsappVerified: v.boolean(),
    societyId: v.optional(v.id("societies")),
    blockId: v.optional(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const profile = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, {
      whatsapp: args.whatsapp,
      whatsappVerified: args.whatsappVerified,
      onboardingComplete: true,
      ...(args.societyId ? { societyId: args.societyId } : {}),
      ...(args.blockId ? { blockId: args.blockId, defaultBlockId: args.blockId } : {}),
    });
    return profile._id;
  },
});

export const bulkImportResidents = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    rows: v.array(v.object({
      name: v.string(),
      flatNumber: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      flatType: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    let inserted = 0;
    let skipped = 0;

    for (const row of args.rows) {
      if (!row.name || !row.flatNumber) { skipped++; continue; }

      const existing = await ctx.db
        .query("users")
        .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
        .filter((q) => q.eq(q.field("flatNumber"), row.flatNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: row.name,
          phone: row.phone,
          email: row.email,
          flatType: row.flatType,
        });
        skipped++;
      } else {
        await ctx.db.insert("users", {
          societyId: args.societyId,
          blockId: args.blockId,
          defaultBlockId: args.blockId,
          name: row.name,
          flatNumber: row.flatNumber,
          phone: row.phone,
          email: row.email,
          flatType: row.flatType,
          role: "resident",
          isActive: true,
        });
        inserted++;
      }
    }

    return { inserted, skipped };
  },
});

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});


export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) return [];
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!caller || (caller.role !== "admin" && caller.role !== "platform_admin")) return [];
    return ctx.db.query("users").take(500);
  },
});
