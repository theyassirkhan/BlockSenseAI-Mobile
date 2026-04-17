import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getStaffDirectory = query({
  args: { societyId: v.id("societies") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db
      .query("staff")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .collect();
  },
});

export const addStaff = mutation({
  args: {
    societyId: v.id("societies"),
    name: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    shift: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("night"),
      v.literal("full_day")
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.db.insert("staff", {
      ...args,
      isOnDuty: false,
      createdAt: Date.now(),
    });
  },
});

export const markAttendance = mutation({
  args: {
    staffId: v.id("staff"),
    isOnDuty: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.staffId, {
      isOnDuty: args.isOnDuty,
      lastAttendanceAt: Date.now(),
    });
  },
});

export const updateStaff = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    shift: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("night"),
        v.literal("full_day")
      )
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const { staffId, ...patch } = args;
    await ctx.db.patch(staffId, patch);
  },
});

export const removeStaff = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.delete(args.staffId);
  },
});

export const getTasks = query({
  args: {
    societyId: v.id("societies"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("done")
      )
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    if (args.status) {
      return ctx.db
        .query("tasks")
        .withIndex("by_status", (q) =>
          q.eq("societyId", args.societyId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }
    return ctx.db
      .query("tasks")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .collect();
  },
});

export const createTask = mutation({
  args: {
    societyId: v.id("societies"),
    blockId: v.optional(v.id("blocks")),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("staff")),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    return ctx.db.insert("tasks", {
      ...args,
      status: "open",
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.taskId, {
      status: args.status,
      ...(args.status === "done" ? { completedAt: Date.now() } : {}),
    });
  },
});
