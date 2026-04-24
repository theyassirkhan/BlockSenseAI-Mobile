"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { UpiQrButton } from "@/components/ui/upi-qr";

const STATUS_COLOR: Record<string, "default" | "warning" | "critical" | "secondary"> = {
  confirmed: "default",
  pending: "warning",
  overdue: "critical",
  pending_confirmation: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  pending_confirmation: "Awaiting confirmation",
};

const WA_NUMBER = "919739121146";

export default function ResidentPaymentsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const dues = useQuery(api.payments.getMyDues, societyId ? { societyId } : "skip");
  const society = useQuery(api.societies.get, societyId ? { societyId } : "skip");

  const pending = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
  const paid = (dues ?? []).filter(d => d.status === "confirmed");
  const totalDue = pending.reduce((s, p) => s + p.amount, 0);

  function buildWaMessage(description: string, amount: number) {
    const msg = `Hi, I am ${profile?.name ?? "resident"} from Flat ${profile?.flatNumber ?? ""}. I would like to pay ₹${amount.toLocaleString("en-IN")} for ${description}. Please confirm once received.`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        My Payments
      </h1>

      {totalDue > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4">
          <p className="font-semibold text-amber-300">₹{totalDue.toLocaleString("en-IN")} due</p>
          <p className="text-xs text-amber-400/80 mt-0.5">{pending.length} payment{pending.length > 1 ? "s" : ""} pending</p>
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-warning">Pending payments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {pending.map(p => (
              <div key={p._id} className="border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium">{p.description}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDateTime(p.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">₹{p.amount.toLocaleString("en-IN")}</span>
                    <Badge variant={STATUS_COLOR[p.status] ?? "secondary"} className="text-[10px]">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </div>
                </div>
                {/* Payment actions */}
                {(p.status === "pending" || p.status === "overdue") && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <UpiQrButton
                      upiId={society?.upiId}
                      payeeName={society?.name ?? "Society"}
                      amount={p.amount}
                      description={p.description}
                    />
                    <a
                      href={buildWaMessage(p.description, p.amount)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-500/30 bg-green-950/20 rounded-lg px-2.5 py-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Notify via WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {paid.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Payment history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {paid.slice(0, 10).map(p => (
              <div key={p._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-sm font-medium">{p.description}</p>
                  <p className="text-xs text-muted-foreground">{p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₹{p.amount.toLocaleString("en-IN")}</span>
                  <Badge variant="default" className="text-[10px]">Paid</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!dues?.length && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-sm">No payment records yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
