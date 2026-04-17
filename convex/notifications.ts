import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

async function sendMsg91WhatsApp(
  whatsapp: string,
  templateId: string,
  variables: Record<string, string>
) {
  const apiKey = process.env.MSG91_API_KEY;
  const number = process.env.MSG91_WHATSAPP_NUMBER;
  if (!apiKey || !number) return;

  const components = Object.entries(variables).map(([key, value]) => ({
    type: "body",
    parameters: [{ type: "text", text: value }],
  }));

  await fetch(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: apiKey,
      },
      body: JSON.stringify({
        integrated_number: number,
        content_type: "template",
        payload: {
          to: [{ user_whatsapp_number: whatsapp }],
          type: "template",
          template: {
            name: templateId,
            language: { code: "en" },
            components,
          },
        },
      }),
    }
  );
}

export const notifyCommittee = internalAction({
  args: {
    societyId: v.id("societies"),
    blockId: v.id("blocks"),
    templateId: v.string(),
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.runQuery(internal.users.getRWAMembers, {
      societyId: args.societyId,
    });
    for (const member of members) {
      if (member.whatsapp) {
        await sendMsg91WhatsApp(
          member.whatsapp,
          args.templateId,
          args.variables
        );
      }
    }
  },
});

export const notifyVendorTankerOrder = internalAction({
  args: {
    societyId: v.id("societies"),
    vendorId: v.id("vendors"),
    orderId: v.id("tankerOrders"),
    quantityKL: v.number(),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.runQuery(internal.vendors.getById, {
      vendorId: args.vendorId,
    });
    const society = await ctx.runQuery(internal.societies_internal.getInternal, {
      societyId: args.societyId,
    });
    if (vendor?.whatsapp && society) {
      await sendMsg91WhatsApp(vendor.whatsapp, "tanker_order_vendor", {
        vendor_name: vendor.name,
        society_name: society.name,
        quantity: String(args.quantityKL),
        order_id: args.orderId,
      });
    }
  },
});

export const sendWeeklyDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const societies = await ctx.runQuery(internal.societies_internal.listAllInternal, {});
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const society of societies) {
      const [blocks, members] = await Promise.all([
        ctx.runQuery(internal.societies_internal.getBlocksInternal, { societyId: society._id }),
        ctx.runQuery(internal.users.getRWAMembers, { societyId: society._id }),
      ]);

      if (blocks.length === 0 || members.length === 0) continue;

      const block = blocks[0];

      // Query summary data for the digest
      const [alerts, waterReadings] = await Promise.all([
        ctx.runQuery(internal.alerts.getWeeklyAlertSummary, {
          societyId: society._id,
          blockId: block._id,
          since: weekAgo,
        }),
        ctx.runQuery(internal.water.getWeeklyConsumption, {
          societyId: society._id,
          blockId: block._id,
          since: weekAgo,
        }),
      ]);

      const summaryText =
        `Weekly digest for ${society.name}: ` +
        `${alerts.total} alerts (${alerts.critical} critical), ` +
        `water usage ${waterReadings.totalKL} KL this week.`;

      for (const member of members) {
        if (member.whatsapp) {
          await sendMsg91WhatsApp(member.whatsapp, "weekly_digest", {
            society_name: society.name,
            alert_count: String(alerts.total),
            critical_count: String(alerts.critical),
            water_usage: String(waterReadings.totalKL),
          });
        }
      }

      console.log(`[WeeklyDigest] ${summaryText}`);
    }
  },
});
