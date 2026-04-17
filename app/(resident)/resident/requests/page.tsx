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
import { ClipboardList, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const CATEGORIES = ["plumbing", "electrical", "carpentry", "cleaning", "pest_control", "lift", "parking", "security", "other"];

const STATUS_COLOR: Record<string, "default" | "warning" | "secondary" | "critical"> = {
  open: "warning",
  in_progress: "default",
  resolved: "secondary",
  closed: "secondary",
};

export default function ResidentRequestsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const blockId = profile?.blockId;
  const myRequests = useQuery(api.serviceRequests.getMyRequests, societyId ? { societyId } : "skip");
  const createRequest = useMutation(api.serviceRequests.create);
  const rateRequest = useMutation(api.serviceRequests.rate);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "plumbing", description: "", priority: "medium" as "low" | "medium" | "urgent" });

  async function handleCreate() {
    if (!societyId || !blockId || !form.description) return toast.error("Description required — make sure your block is set in your profile");
    setSaving(true);
    try {
      await createRequest({
        societyId,
        blockId: blockId as any,
        category: form.category,
        description: form.description,
        priority: form.priority,
      });
      toast.success("Request submitted");
      setForm({ category: "plumbing", description: "", priority: "medium" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRate(requestId: Id<"serviceRequests">, rating: number) {
    try {
      await rateRequest({ requestId, rating });
      toast.success("Rating submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          My Requests
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Submit Service Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
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
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Submitting…" : "Submit"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(myRequests ?? []).map(r => (
          <Card key={r._id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm capitalize">{r.category.replace("_", " ")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(r.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={STATUS_COLOR[r.status] ?? "secondary"} className="text-[10px]">
                    {r.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">{r.priority}</Badge>
                </div>
              </div>
              {r.internalNotes && (
                <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
                  <span className="font-medium">Update: </span>{r.internalNotes}
                </div>
              )}
              {r.status === "resolved" && !r.residentRating && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rate resolution:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => handleRate(r._id, star)} className="text-muted-foreground hover:text-yellow-500 transition-colors">
                      <Star className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
              {r.residentRating && (
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: r.residentRating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Your rating</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!(myRequests ?? []).length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No requests yet. Submit one above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
