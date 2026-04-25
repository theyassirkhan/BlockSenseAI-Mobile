import { internalAction } from "./_generated/server";
import { v } from "convex/values";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) return; // silent skip if not configured
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from: "BlockSense <noreply@blocksense.app>",
    to,
    subject,
    html,
  });
}

export const sendVisitorArrivalEmail = internalAction({
  args: {
    residentEmail: v.string(),
    residentName: v.string(),
    visitorName: v.string(),
    visitorPhone: v.string(),
    flatNumber: v.string(),
    societyName: v.string(),
  },
  handler: async (_ctx, args) => {
    await sendEmail(
      args.residentEmail,
      `Visitor arrived at ${args.societyName}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#A855F7">Visitor Alert 🔔</h2>
        <p>Hi ${args.residentName},</p>
        <p>A visitor has arrived at the gate for <strong>Flat ${args.flatNumber}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;color:#666">Visitor name</td><td style="padding:8px;font-weight:600">${args.visitorName}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Phone</td><td style="padding:8px;font-weight:600">${args.visitorPhone}</td></tr>
        </table>
        <p style="color:#666;font-size:12px">— ${args.societyName} Security</p>
      </div>`
    );
  },
});

export const sendPaymentDueEmail = internalAction({
  args: {
    residentEmail: v.string(),
    residentName: v.string(),
    amount: v.number(),
    dueDate: v.string(),
    societyName: v.string(),
  },
  handler: async (_ctx, args) => {
    await sendEmail(
      args.residentEmail,
      `Payment due: ₹${args.amount.toLocaleString("en-IN")} — ${args.societyName}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#F59E0B">Payment Reminder 💳</h2>
        <p>Hi ${args.residentName},</p>
        <p>You have a maintenance payment due.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;color:#666">Amount</td><td style="padding:8px;font-weight:600;font-size:18px">₹${args.amount.toLocaleString("en-IN")}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Due date</td><td style="padding:8px;font-weight:600">${args.dueDate}</td></tr>
        </table>
        <p>Please log in to the BlockSense resident portal to pay.</p>
        <p style="color:#666;font-size:12px">— ${args.societyName} Management</p>
      </div>`
    );
  },
});

export const sendGatePassApprovedEmail = internalAction({
  args: {
    residentEmail: v.string(),
    residentName: v.string(),
    visitorName: v.string(),
    approvedAt: v.string(),
    societyName: v.string(),
  },
  handler: async (_ctx, args) => {
    await sendEmail(
      args.residentEmail,
      `Gate pass approved — ${args.visitorName} entered`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#34D399">Gate Pass Approved ✅</h2>
        <p>Hi ${args.residentName},</p>
        <p><strong>${args.visitorName}</strong> was approved entry to your flat at ${args.approvedAt}.</p>
        <p style="color:#666;font-size:12px">— ${args.societyName} Security</p>
      </div>`
    );
  },
});
