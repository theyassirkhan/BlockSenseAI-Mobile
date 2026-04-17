"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const PRIORITY_COLOR: Record<string, "critical" | "warning" | "secondary"> = {
  urgent: "critical",
  high: "warning",
  medium: "secondary",
  low: "secondary",
};

export default function RwaTicketsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const tickets = useQuery(api.adminTickets.getMyTickets, societyId ? { societyId } : "skip");
  const createTicket = useMutation(api.adminTickets.create);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "billing",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
  });

  async function handleCreate() {
    if (!societyId || !form.subject || !form.description) return toast.error("Subject and description required");
    setSaving(true);
    try {
      await createTicket({
        societyId,
        subject: form.subject,
        description: form.description,
        category: form.category,
        priority: form.priority,
      });
      toast.success("Ticket created");
      setForm({ subject: "", description: "", category: "billing", priority: "medium" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TicketCheck className="h-5 w-5" />
          Support Tickets
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New ticket
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Create Support Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="feature_request">Feature request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of the issue" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create ticket"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
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
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).map(t => (
                  <tr key={t._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3 font-medium max-w-[240px] truncate">{t.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{t.category.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_COLOR[t.priority] ?? "secondary"} className="text-[10px]">{t.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${t.status === "open" ? "text-warning" : t.status === "resolved" || t.status === "closed" ? "text-success" : "text-blue-600"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(t.createdAt)}</td>
                  </tr>
                ))}
                {!(tickets ?? []).length && (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No tickets yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
