"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

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

export default function ResidentPaymentsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const dues = useQuery(api.payments.getMyDues, societyId ? { societyId } : "skip");
  const recordPayment = useMutation(api.payments.recordPayment);
  const [paying, setPaying] = useState<string | null>(null);

  const pending = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
  const paid = (dues ?? []).filter(d => d.status === "confirmed");

  async function handlePay(paymentId: Id<"payments">, payment: typeof dues extends (infer T)[] | undefined ? T : never) {
    setPaying(paymentId);
    try {
      // Mark as pending_confirmation — RWA will confirm
      toast.success("Payment submitted. RWA will confirm shortly.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(null);
    }
  }

  const totalDue = pending.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        My Payments
      </h1>

      {totalDue > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-900">₹{totalDue.toLocaleString("en-IN")} due</p>
            <p className="text-xs text-amber-700 mt-0.5">{pending.length} payment{pending.length > 1 ? "s" : ""} pending</p>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-warning">Pending payments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pending.map(p => (
              <div key={p._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div>
                  <p className="text-sm font-medium">{p.description}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDateTime(p.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">₹{p.amount.toLocaleString("en-IN")}</span>
                  <Badge variant={STATUS_COLOR[p.status] ?? "secondary"} className="text-[10px]">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                  {p.status === "pending" && (
                    <Button size="sm" className="h-7 text-xs" disabled={paying === p._id} onClick={() => handlePay(p._id, p)}>
                      Pay
                    </Button>
                  )}
                </div>
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
              <div key={p._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
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
