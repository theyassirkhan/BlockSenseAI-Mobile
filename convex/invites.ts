import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

function randomToken(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const create = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.optional(v.id("blocks")),
    flatNumber: v.optional(v.string()),
    role: v.union(
      v.literal("resident"),
      v.literal("guard"),
      v.literal("staff"),
      v.literal("admin")
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId as string))
      .first();
    if (!caller) throw new Error("Profile not found");
    // Only RWA or admin can create invites
    if (caller.role !== "rwa" && caller.role !== "admin" && caller.role !== "platform_admin") {
      throw new Error("Forbidden: only RWA managers and admins can create invites");
    }
    // Caller can only invite to their own society
    if (caller.role !== "platform_admin" && caller.societyId !== args.societyId) {
      throw new Error("Forbidden: you can only invite to your own society");
    }
    const token = randomToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const id = await ctx.db.insert("invites", {
      ...args,
      token,
      createdBy: userId,
      expiresAt,
    });
    return { token, id };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", q => q.eq("token", token))
      .first();
    if (!invite) return null;
    if (invite.expiresAt < Date.now()) return null;
    if (invite.usedAt) return null;
    const society = await ctx.db.get(invite.societyId);
    const block = invite.blockId ? await ctx.db.get(invite.blockId) : null;
    return { ...invite, society, block };
  },
});

export const consume = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", q => q.eq("token", token))
      .first();
    if (!invite) throw new Error("Invite not found or expired");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");
    if (invite.usedAt) throw new Error("Invite already used");
    await ctx.db.patch(invite._id, { usedAt: Date.now(), usedBy: userId });
    return {
      societyId: invite.societyId,
      blockId: invite.blockId,
      flatNumber: invite.flatNumber,
      role: invite.role,
    };
  },
});

export const listBySociety = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, { societyId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId as string))
      .first();
    if (!caller) return [];
    if (caller.role !== "rwa" && caller.role !== "admin" && caller.role !== "platform_admin") return [];
    const rows = await ctx.db
      .query("invites")
      .withIndex("by_society", q => q.eq("societyId", societyId))
      .order("desc")
      .take(50);
    return rows;
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId as string))
      .first();
    if (!caller) throw new Error("Profile not found");
    if (caller.role !== "rwa" && caller.role !== "admin" && caller.role !== "platform_admin") {
      throw new Error("Forbidden: only RWA managers and admins can revoke invites");
    }
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found");
    if (caller.role !== "platform_admin" && caller.societyId !== invite.societyId) {
      throw new Error("Forbidden: this invite does not belong to your society");
    }
    await ctx.db.patch(inviteId, { usedAt: Date.now() });
  },
});
