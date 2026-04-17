"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const PRIORITY_COLOR: Record<string, "critical" | "warning" | "secondary"> = {
  urgent: "critical",
  high: "warning",
  medium: "secondary",
  low: "secondary",
};

const STATUS_STEPS = ["open", "in_progress", "resolved", "closed"] as const;

export default function AdminTicketsPage() {
  const tickets = useQuery(api.adminTickets.getAll, {});
  const updateStatus = useMutation(api.adminTickets.updateStatus);
  const societies = useQuery(api.societies_internal.listAll, {});
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const societyMap = new Map(societies?.map((s) => [s._id, s.name]) ?? []);

  const filtered = (tickets ?? []).filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const now = Date.now();
  const hoursOpen = (t: { createdAt: number }) =>
    Math.floor((now - t.createdAt) / 3600000);

  async function advance(ticketId: Id<"adminTickets">, current: string) {
    const idx = STATUS_STEPS.indexOf(current as any);
    if (idx < 0 || idx >= STATUS_STEPS.length - 1) return;
    try {
      await updateStatus({ ticketId, status: STATUS_STEPS[idx + 1] });
      toast.success("Ticket updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TicketCheck className="h-5 w-5" />
          Support Tickets
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
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Society</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Open</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const hrs = hoursOpen(t);
                  const slaBreached = hrs > (t.priority === "urgent" ? 24 : t.priority === "high" ? 48 : 72);
                  return (
                    <tr
                      key={t._id}
                      className={`border-b hover:bg-muted/30 transition-colors ${slaBreached && t.status === "open" ? "bg-red-50/50" : ""}`}
                      style={{ borderColor: "rgba(0,0,0,0.05)" }}
                    >
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {societyMap.get(t.societyId) ?? t.societyId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_COLOR[t.priority] ?? "secondary"} className="text-[10px]">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${t.status === "open" ? "text-warning" : t.status === "resolved" || t.status === "closed" ? "text-success" : "text-blue-600"}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`flex items-center gap-1 ${slaBreached && t.status === "open" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" />
                          {hrs}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.status !== "closed" && t.status !== "resolved" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advance(t._id, t.status)}>
                            Advance →
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
