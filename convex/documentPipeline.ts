import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Upload URL generation ─────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");
    return ctx.storage.generateUploadUrl();
  },
});

// ── Save document record after upload ────────────────────────────────────────

export const saveDocument = mutation({
  args: {
    societyId: v.id("societies"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();
    if (!user) throw new Error("User not found");

    const docId = await ctx.db.insert("documents", {
      societyId: args.societyId,
      uploadedBy: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.documentPipeline.processDocument, { documentId: docId });
    return docId;
  },
});

// ── Get documents ─────────────────────────────────────────────────────────────

export const listDocuments = query({
  args: {
    societyId: v.id("societies"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_society", (q) => q.eq("societyId", args.societyId))
      .order("desc")
      .take(50);

    return args.status ? docs.filter(d => d.status === args.status) : docs;
  },
});

export const getDocumentWithExtraction = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;

    const extraction = await ctx.db
      .query("documentExtractions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();

    return { ...doc, extraction };
  },
});

// ── Approve / reject document ─────────────────────────────────────────────────

export const approveDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId as string))
      .first();

    await ctx.db.patch(args.documentId, { status: "approved" });

    const extraction = await ctx.db
      .query("documentExtractions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();

    if (extraction && user) {
      await ctx.db.patch(extraction._id, {
        reviewedBy: user._id,
        reviewedAt: Date.now(),
      });
    }
  },
});

export const rejectDocument = mutation({
  args: { documentId: v.id("documents"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Unauthenticated");

    await ctx.db.patch(args.documentId, {
      status: "rejected",
      processingError: args.reason,
    });
  },
});

// ── Internal: process document via Claude ────────────────────────────────────

export const patchDocumentStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("extracted"),
      v.literal("needs_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    docCategory: v.optional(v.union(
      v.literal("water_bill"),
      v.literal("power_bill"),
      v.literal("gas_invoice"),
      v.literal("sewage_invoice"),
      v.literal("solid_waste_invoice"),
      v.literal("garbage_invoice"),
      v.literal("agm_minutes"),
      v.literal("resident_application"),
      v.literal("other")
    )),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { documentId, ...patch } = args;
    await ctx.db.patch(documentId, patch);
  },
});

export const saveExtraction = internalMutation({
  args: {
    documentId: v.id("documents"),
    societyId: v.id("societies"),
    docCategory: v.string(),
    extractedFields: v.any(),
    confidence: v.number(),
    validationIssues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("documentExtractions", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const processDocument = internalAction({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(internal.documentPipeline._getDocument, {
      documentId: args.documentId,
    });
    if (!doc) return;

    await ctx.runMutation(internal.documentPipeline.patchDocumentStatus, {
      documentId: args.documentId,
      status: "processing",
    });

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

      const fileUrl = await ctx.storage.getUrl(doc.storageId);
      if (!fileUrl) throw new Error("Could not get file URL");

      const classifyRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `Classify this document. Filename: "${doc.fileName}".

Return ONLY a JSON object: {"category": "<one of: water_bill, power_bill, gas_invoice, sewage_invoice, solid_waste_invoice, garbage_invoice, agm_minutes, resident_application, other>", "confidence": <0.0-1.0>}

Do not include anything else.`,
          }],
        }),
      });

      const classifyData = await classifyRes.json();
      const classifyText = classifyData.content?.[0]?.text ?? "{}";
      let classifyResult: { category: string; confidence: number } = { category: "other", confidence: 0.5 };
      try { classifyResult = JSON.parse(classifyText.trim()); } catch {}

      const category = classifyResult.category as (typeof doc.docCategory) ?? "other";
      const EXTRACTION_SCHEMAS: Record<string, string> = {
        water_bill: "billingPeriod, amountDue, dueDate, previousBalance, currentReading, previousReading, consumption, utilityProvider",
        power_bill: "billingPeriod, amountDue, dueDate, unitsConsumed, peakUnits, offPeakUnits, utilityProvider, connectionId",
        gas_invoice: "invoiceNumber, invoiceDate, vendorName, amountExcludingGST, gstAmount, totalAmount, gasQuantitySCM, unitRate",
        sewage_invoice: "invoiceNumber, invoiceDate, vendorName, serviceType, amountExcludingGST, gstAmount, totalAmount, serviceDate",
        solid_waste_invoice: "invoiceNumber, invoiceDate, vendorName, wasteCategory, weightKG, ratePerKG, totalAmount, serviceDate",
        garbage_invoice: "invoiceNumber, invoiceDate, vendorName, collectionsCount, amountExcludingGST, gstAmount, totalAmount, servicePeriod",
        agm_minutes: "meetingDate, attendeeCount, chairperson, keyDecisions, nextMeetingDate, itemsDiscussed",
        resident_application: "applicantName, flatNumber, blockName, requestType, requestDate, description",
        other: "title, date, amount, parties, description, keyPoints",
      };

      const schema = EXTRACTION_SCHEMAS[category] ?? EXTRACTION_SCHEMAS.other;

      const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Extract data from this ${category.replace(/_/g, " ")} document.
Filename: "${doc.fileName}"
Document category: ${category}

Extract these fields: ${schema}

Return ONLY a JSON object with the extracted fields and a "confidence" field (0.0-1.0).
Use null for fields not found. All monetary values in INR as numbers.`,
          }],
        }),
      });

      const extractData = await extractRes.json();
      const extractText = extractData.content?.[0]?.text ?? "{}";
      let extracted: Record<string, unknown> = { raw: extractText };
      let confidence = 0.7;

      try {
        extracted = JSON.parse(extractText.trim());
        if (typeof extracted.confidence === "number") {
          confidence = extracted.confidence;
          delete extracted.confidence;
        }
      } catch {}

      const validationIssues: string[] = [];
      if (confidence < 0.6) validationIssues.push("Low extraction confidence — manual review recommended");

      if (["water_bill", "power_bill", "gas_invoice", "sewage_invoice", "solid_waste_invoice", "garbage_invoice"].includes(category)) {
        const amountFields = ["amountDue", "totalAmount", "amount"];
        const hasAmount = amountFields.some(f => extracted[f] != null && extracted[f] !== "null");
        if (!hasAmount) validationIssues.push("Amount not detected in document");
      }

      await ctx.runMutation(internal.documentPipeline.saveExtraction, {
        documentId: args.documentId,
        societyId: doc.societyId,
        docCategory: category,
        extractedFields: extracted,
        confidence,
        validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
      });

      const needsReview = validationIssues.length > 0 || confidence < 0.75;

      await ctx.runMutation(internal.documentPipeline.patchDocumentStatus, {
        documentId: args.documentId,
        status: needsReview ? "needs_review" : "extracted",
        docCategory: category,
      });
    } catch (err) {
      await ctx.runMutation(internal.documentPipeline.patchDocumentStatus, {
        documentId: args.documentId,
        status: "needs_review",
        processingError: err instanceof Error ? err.message : "Processing failed",
      });
    }
  },
});

export const _getDocument = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => ctx.db.get(args.documentId),
});
