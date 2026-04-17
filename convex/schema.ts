import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema(
  {
    ...authTables,

    societies: defineTable({
      name: v.string(),
      address: v.optional(v.string()),
      city: v.string(),
      totalFlats: v.optional(v.number()),
      totalBlocks: v.optional(v.number()),
      subscriptionPlan: v.union(
        v.literal("basic"),
        v.literal("pro"),
        v.literal("enterprise")
      ),
      isActive: v.optional(v.boolean()),
      mrr: v.optional(v.number()),
      nextBillingDate: v.optional(v.number()),
      logoStorageId: v.optional(v.id("_storage")),
      upiId: v.optional(v.string()),
      helplinePhone: v.optional(v.string()),
      createdAt: v.number(),
    }),

    blocks: defineTable({
      societyId: v.id("societies"),
      name: v.string(),
      type: v.union(
        v.literal("block"),
        v.literal("wing"),
        v.literal("villa"),
        v.literal("tower")
      ),
      totalFlats: v.optional(v.number()),
      occupiedFlats: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_society", ["societyId"]),

    users: defineTable({
      societyId: v.optional(v.id("societies")),
      blockId: v.optional(v.id("blocks")),
      defaultBlockId: v.optional(v.id("blocks")),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
      role: v.optional(
        v.union(
          v.literal("platform_admin"),
          v.literal("admin"),
          v.literal("rwa"),
          v.literal("resident"),
          v.literal("staff")
        )
      ),
      flatNumber: v.optional(v.string()),
      flatType: v.optional(v.string()),
      moveInDate: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      isAnonymous: v.optional(v.boolean()),
      tokenIdentifier: v.optional(v.string()),
      notifWhatsapp: v.optional(v.boolean()),
      notifInApp: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
    })
      .index("by_society", ["societyId"])
      .index("by_token", ["tokenIdentifier"])
      .index("email", ["email"]),

    waterTanks: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      name: v.string(),
      type: v.union(
        v.literal("overhead"),
        v.literal("sump"),
        v.literal("borewell_sump")
      ),
      capacityKL: v.number(),
      currentLevelPct: v.number(),
      lastUpdated: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"]),

    waterReadings: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      source: v.union(
        v.literal("cauvery"),
        v.literal("borewell"),
        v.literal("tanker"),
        v.literal("rainwater")
      ),
      readingType: v.union(
        v.literal("inflow"),
        v.literal("consumption"),
        v.literal("tank_level")
      ),
      value: v.number(),
      unit: v.string(),
      recordedBy: v.id("users"),
      recordedAt: v.number(),
      notes: v.optional(v.string()),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_recorded_at", ["societyId", "blockId", "recordedAt"]),

    tankerOrders: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      vendorId: v.id("vendors"),
      quantityKL: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("delivered"),
        v.literal("cancelled")
      ),
      orderedBy: v.optional(v.id("users")),
      triggeredBy: v.string(),
      scheduledAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
      cost: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_status", ["societyId", "status"]),

    powerReadings: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      source: v.union(
        v.literal("grid"),
        v.literal("solar"),
        v.literal("dg")
      ),
      readingType: v.union(
        v.literal("generation"),
        v.literal("consumption"),
        v.literal("export")
      ),
      valueKWH: v.number(),
      recordedBy: v.id("users"),
      recordedAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_recorded_at", ["societyId", "blockId", "recordedAt"]),

    dgUnits: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      name: v.string(),
      capacityKVA: v.number(),
      dieselCapacityLiters: v.number(),
      dieselLevelLiters: v.number(),
      isRunning: v.boolean(),
      totalRuntimeHours: v.number(),
      consumptionRateLPH: v.number(),
      lastServiceDate: v.optional(v.number()),
      lastUpdated: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"]),

    powerOutages: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      dgUnitId: v.optional(v.id("dgUnits")),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      durationHrs: v.optional(v.number()),
      dieselUsedL: v.optional(v.number()),
      loggedBy: v.id("users"),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"]),

    gasReadings: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      meterReading: v.number(),
      consumptionSCM: v.optional(v.number()),
      pressurePSI: v.number(),
      recordedBy: v.id("users"),
      recordedAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_recorded_at", ["societyId", "blockId", "recordedAt"]),

    sewageReadings: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      stpStatus: v.union(
        v.literal("normal"),
        v.literal("maintenance"),
        v.literal("fault"),
        v.literal("offline")
      ),
      sludgeTankPct: v.number(),
      treatedTankPct: v.number(),
      inflowRateLPH: v.optional(v.number()),
      recordedBy: v.id("users"),
      recordedAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_recorded_at", ["societyId", "blockId", "recordedAt"]),

    wasteLogs: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      dryWasteKG: v.number(),
      wetWasteKG: v.number(),
      totalKG: v.number(),
      segregationOk: v.boolean(),
      loggedBy: v.id("users"),
      loggedAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_logged_at", ["societyId", "blockId", "loggedAt"]),

    garbageCollectionLog: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      scheduledAt: v.number(),
      collectedAt: v.optional(v.number()),
      status: v.union(
        v.literal("collected"),
        v.literal("missed"),
        v.literal("rescheduled"),
        v.literal("pending")
      ),
      vendorId: v.id("vendors"),
      confirmedBy: v.optional(v.id("users")),
      notes: v.optional(v.string()),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_status", ["societyId", "status"]),

    alerts: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      utility: v.union(
        v.literal("water"),
        v.literal("power"),
        v.literal("gas"),
        v.literal("sewage"),
        v.literal("waste"),
        v.literal("garbage"),
        v.literal("general")
      ),
      alertType: v.union(
        v.literal("predictive"),
        v.literal("anomaly"),
        v.literal("threshold")
      ),
      severity: v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("critical")
      ),
      title: v.string(),
      message: v.string(),
      metadata: v.optional(v.any()),
      isResolved: v.boolean(),
      resolvedBy: v.optional(v.id("users")),
      resolvedAt: v.optional(v.number()),
      triggeredAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_resolved", ["societyId", "isResolved"]),

    vendors: defineTable({
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
      isActive: v.optional(v.boolean()),
      rating: v.optional(v.number()),
      totalJobs: v.optional(v.number()),
    }).index("by_society", ["societyId"]),

    predictionLog: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      utility: v.string(),
      predictionType: v.string(),
      predictedValue: v.number(),
      predictedAt: v.number(),
      eventDate: v.optional(v.number()),
      confidenceScore: v.optional(v.number()),
      actualValue: v.optional(v.number()),
      wasAccurate: v.optional(v.boolean()),
      modelVersion: v.string(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"]),

    staff: defineTable({
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
      isOnDuty: v.boolean(),
      lastAttendanceAt: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_society", ["societyId"]),

    tasks: defineTable({
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
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("done")
      ),
      dueAt: v.optional(v.number()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_society", ["societyId"])
      .index("by_status", ["societyId", "status"]),

    // ── NEW TABLES ─────────────────────────────────────

    serviceRequests: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      residentId: v.id("users"),
      category: v.string(),
      description: v.string(),
      photoStorageId: v.optional(v.id("_storage")),
      priority: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("urgent")
      ),
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed")
      ),
      assignedTo: v.optional(v.id("users")),
      internalNotes: v.optional(v.string()),
      residentRating: v.optional(v.number()),
      resolvedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_resident", ["societyId", "residentId"])
      .index("by_status", ["societyId", "status"]),

    complaints: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      residentId: v.id("users"),
      subject: v.string(),
      description: v.string(),
      category: v.string(),
      severity: v.union(
        v.literal("minor"),
        v.literal("moderate"),
        v.literal("serious")
      ),
      isAnonymous: v.boolean(),
      status: v.union(
        v.literal("open"),
        v.literal("under_review"),
        v.literal("resolved"),
        v.literal("escalated")
      ),
      rwaResponse: v.optional(v.string()),
      escalatedToAdmin: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_resident", ["societyId", "residentId"]),

    payments: defineTable({
      societyId: v.id("societies"),
      blockId: v.id("blocks"),
      residentId: v.id("users"),
      type: v.union(
        v.literal("monthly_maintenance"),
        v.literal("one_time"),
        v.literal("penalty"),
        v.literal("other")
      ),
      description: v.string(),
      amount: v.number(),
      dueDate: v.number(),
      paidAt: v.optional(v.number()),
      paymentMethod: v.optional(
        v.union(
          v.literal("cash"),
          v.literal("upi"),
          v.literal("bank_transfer"),
          v.literal("online")
        )
      ),
      status: v.union(
        v.literal("pending"),
        v.literal("pending_confirmation"),
        v.literal("confirmed"),
        v.literal("overdue")
      ),
      confirmedBy: v.optional(v.id("users")),
      receiptUrl: v.optional(v.string()),
      screenshotStorageId: v.optional(v.id("_storage")),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"])
      .index("by_resident", ["societyId", "residentId"])
      .index("by_status", ["societyId", "status"]),

    maintenanceCharges: defineTable({
      societyId: v.id("societies"),
      flatType: v.string(),
      monthlyAmount: v.number(),
      dueDay: v.number(),
      lateFeeAmount: v.optional(v.number()),
      lateFeeType: v.optional(
        v.union(v.literal("flat"), v.literal("percentage"))
      ),
      effectiveFrom: v.number(),
    }).index("by_society", ["societyId"]),

    notices: defineTable({
      societyId: v.id("societies"),
      blockId: v.optional(v.id("blocks")),
      title: v.string(),
      content: v.string(),
      type: v.union(
        v.literal("emergency"),
        v.literal("maintenance"),
        v.literal("general"),
        v.literal("payment")
      ),
      postedBy: v.id("users"),
      expiresAt: v.optional(v.number()),
      isPinned: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_block", ["societyId", "blockId"]),

    broadcasts: defineTable({
      societyId: v.optional(v.id("societies")),
      blockId: v.optional(v.id("blocks")),
      sentBy: v.id("users"),
      title: v.string(),
      message: v.string(),
      type: v.union(
        v.literal("alert"),
        v.literal("warning"),
        v.literal("info"),
        v.literal("maintenance")
      ),
      targetAudience: v.string(),
      channels: v.array(v.string()),
      sentCount: v.number(),
      deliveredCount: v.optional(v.number()),
      scheduledAt: v.optional(v.number()),
      sentAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_sent_at", ["sentAt"]),

    adminTickets: defineTable({
      societyId: v.id("societies"),
      raisedBy: v.id("users"),
      subject: v.string(),
      category: v.string(),
      description: v.string(),
      priority: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      ),
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed")
      ),
      assignedAdmin: v.optional(v.id("users")),
      attachmentStorageId: v.optional(v.id("_storage")),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    })
      .index("by_society", ["societyId"])
      .index("by_status", ["status"]),

    ticketMessages: defineTable({
      ticketId: v.id("adminTickets"),
      sentBy: v.id("users"),
      message: v.string(),
      isInternal: v.boolean(),
      createdAt: v.number(),
    }).index("by_ticket", ["ticketId"]),

    visitors: defineTable({
      societyId: v.id("societies"),
      registeredBy: v.id("users"),
      visitorName: v.string(),
      visitorPhone: v.string(),
      expectedAt: v.number(),
      passCode: v.string(),
      checkedInAt: v.optional(v.number()),
      checkedOutAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_resident", ["societyId", "registeredBy"]),

    vehicles: defineTable({
      societyId: v.id("societies"),
      residentId: v.id("users"),
      vehicleNumber: v.string(),
      type: v.union(
        v.literal("car"),
        v.literal("bike"),
        v.literal("other")
      ),
      parkingSlot: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_society", ["societyId"])
      .index("by_resident", ["societyId", "residentId"]),

    shifts: defineTable({
      societyId: v.id("societies"),
      staffId: v.id("users"),
      blockId: v.optional(v.id("blocks")),
      date: v.number(),
      shiftType: v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("night")
      ),
      startTime: v.string(),
      endTime: v.string(),
      status: v.union(
        v.literal("scheduled"),
        v.literal("present"),
        v.literal("absent"),
        v.literal("half_day"),
        v.literal("leave")
      ),
      markedBy: v.optional(v.id("users")),
      markedAt: v.optional(v.number()),
    })
      .index("by_society", ["societyId"])
      .index("by_staff", ["societyId", "staffId"])
      .index("by_date", ["societyId", "date"]),
  },
  { schemaValidation: true }
);
