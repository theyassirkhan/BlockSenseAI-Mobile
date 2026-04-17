"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const PRIORITY_COLOR: Record<string, "critical" | "warning" | "secondary"> = {
  urgent: "critical",
  medium: "warning",
  low: "secondary",
};

const STATUS_STEPS = ["open", "in_progress", "resolved", "closed"] as const;

export default function ServiceRequestsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const requests = useQuery(api.serviceRequests.getBySociety, societyId ? { societyId } : "skip");
  const updateStatus = useMutation(api.serviceRequests.updateStatus);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = (requests ?? []).filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const categories = Array.from(new Set((requests ?? []).map(r => r.category)));

  const now = Date.now();
  const hoursOpen = (r: { createdAt: number }) => Math.floor((now - r.createdAt) / 3600000);

  async function advance(requestId: Id<"serviceRequests">, current: string) {
    const idx = STATUS_STEPS.indexOf(current as any);
    if (idx < 0 || idx >= STATUS_STEPS.length - 1) return;
    try {
      await updateStatus({ requestId, status: STATUS_STEPS[idx + 1] });
      toast.success("Request updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Service Requests
        </h1>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
<SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open", count: (requests ?? []).filter(r => r.status === "open").length, color: "text-warning" },
          { label: "In Progress", count: (requests ?? []).filter(r => r.status === "in_progress").length, color: "text-blue-600" },
          { label: "Resolved", count: (requests ?? []).filter(r => r.status === "resolved").length, color: "text-success" },
          { label: "Total", count: (requests ?? []).length, color: "text-foreground" },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-card border rounded-lg p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Open</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const hrs = hoursOpen(r);
                  return (
                    <tr key={r._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{r.description}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{r.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_COLOR[r.priority ?? "medium"] ?? "secondary"} className="text-[10px]">
                          {r.priority ?? "medium"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${r.status === "open" ? "text-warning" : r.status === "resolved" || r.status === "closed" ? "text-success" : "text-blue-600"}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {hrs}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status !== "closed" && r.status !== "resolved" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advance(r._id, r.status)}>
                            Advance →
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
