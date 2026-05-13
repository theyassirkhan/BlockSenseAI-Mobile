import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getOrCreateSession = mutation({
  args: {
    societyId: v.id("societies"),
    sessionId: v.optional(v.id("agentSessions")),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    if (args.sessionId) {
      const existing = await ctx.db.get(args.sessionId);
      if (existing && existing.societyId === args.societyId) return existing._id;
    }

    return ctx.db.insert("agentSessions", {
      societyId: args.societyId,
      userId: user._id,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const listSessions = query({
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
      .query("agentSessions")
      .withIndex("by_society_user", (q) =>
        q.eq("societyId", args.societyId).eq("userId", user._id)
      )
      .order("desc")
      .take(20);
  },
});

export const getSessionMessages = query({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    return ctx.db
      .query("agentMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const saveMessage = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    societyId: v.id("societies"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    toolName: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    toolInput: v.optional(v.any()),
    toolOutput: v.optional(v.any()),
    pendingAction: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const msgId = await ctx.db.insert("agentMessages", {
      ...args,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.sessionId, {
      lastMessageAt: Date.now(),
      messageCount: (await ctx.db.get(args.sessionId))!.messageCount + 1,
    });

    return msgId;
  },
});

export const updateSessionTitle = mutation({
  args: { sessionId: v.id("agentSessions"), title: v.string() },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    await ctx.db.patch(args.sessionId, { title: args.title });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    await Promise.all(messages.map(m => ctx.db.delete(m._id)));
    await ctx.db.delete(args.sessionId);
  },
});
