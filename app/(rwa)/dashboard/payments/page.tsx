"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Settings2 } from "lucide-react";
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

export default function PaymentsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const summary = useQuery(api.payments.getSummary, societyId ? { societyId } : "skip");
  const payments = useQuery(api.payments.getBySociety, societyId ? { societyId } : "skip");
  const charges = useQuery(api.payments.getMaintenanceCharges, societyId ? { societyId } : "skip");
  const setCharge = useMutation(api.payments.setMaintenanceCharge);
  const confirmPayment = useMutation(api.payments.confirmPayment);

  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeForm, setChargeForm] = useState({ flatType: "standard", monthlyAmount: "", dueDay: "5" });
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = (payments ?? []).filter(p =>
    filterStatus === "all" || p.status === filterStatus
  );

  async function handleSetCharge() {
    if (!societyId || !chargeForm.flatType || !chargeForm.monthlyAmount) {
      return toast.error("Flat type and amount required");
    }
    try {
      await setCharge({
        societyId,
        flatType: chargeForm.flatType,
        monthlyAmount: Number(chargeForm.monthlyAmount),
        dueDay: Number(chargeForm.dueDay),
      });
      toast.success("Charge saved");
      setShowChargeForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleConfirm(paymentId: Id<"payments">) {
    try {
      await confirmPayment({ paymentId, paymentMethod: "online" });
      toast.success("Payment confirmed");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payments
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowChargeForm(true)}>
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Set charges
          </Button>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="confirmed">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="pending_confirmation">Awaiting confirmation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Collected this month", value: `₹${(summary.totalCollectedThisMonth / 1000).toFixed(0)}K` },
            { label: "Outstanding", value: `₹${(summary.totalOutstanding / 1000).toFixed(0)}K` },
            { label: "Overdue count", value: summary.overdueCount.toString() },
            { label: "Collected count", value: summary.collectedCount.toString() },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-primary mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showChargeForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Set Maintenance Charge</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Flat type</Label>
                <Input value={chargeForm.flatType} onChange={e => setChargeForm({ ...chargeForm, flatType: e.target.value })} placeholder="standard / premium / studio" />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly amount (₹)</Label>
                <Input type="number" value={chargeForm.monthlyAmount} onChange={e => setChargeForm({ ...chargeForm, monthlyAmount: e.target.value })} placeholder="3500" />
              </div>
              <div className="space-y-1.5">
                <Label>Due day of month</Label>
                <Input type="number" min={1} max={28} value={chargeForm.dueDay} onChange={e => setChargeForm({ ...chargeForm, dueDay: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSetCharge}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowChargeForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(charges ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Maintenance Charges</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(charges ?? []).map(c => (
                <div key={c._id} className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{c.flatType}</span>
                  <span className="text-muted-foreground">₹{c.monthlyAmount.toLocaleString("en-IN")} / month · due day {c.dueDay}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Due date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Paid on</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.description}</td>
                    <td className="px-4 py-3">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(p.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLOR[p.status] ?? "secondary"} className="text-[10px]">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.paidAt ? formatDateTime(p.paidAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "pending_confirmation" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleConfirm(p._id)}>
                          Confirm
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
