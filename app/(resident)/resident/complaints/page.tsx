"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageSquareWarning, Plus, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["Water", "Power / Generator", "Lift", "Security", "Cleaning", "Parking", "Noise", "Common Areas", "Other"];

const STATUS_COLOR: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  under_review: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  resolved: "bg-green-500/20 text-green-300 border-green-500/30",
  escalated: "bg-red-500/20 text-red-300 border-red-500/30",
};

const SEVERITY_COLOR: Record<string, string> = {
  minor: "bg-gray-500/20 text-gray-300",
  moderate: "bg-orange-500/20 text-orange-300",
  serious: "bg-red-500/20 text-red-300",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ComplaintsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const blockId = profile?.defaultBlockId;

  const complaints = useQuery(api.complaints.getMyComplaints, societyId ? { societyId } : "skip");
  const create = useMutation(api.complaints.create);

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "Other",
    severity: "minor" as "minor" | "moderate" | "serious",
    isAnonymous: false,
  });

  async function handleSubmit() {
    if (!societyId || !blockId || !form.subject || !form.description) {
      toast.error("Subject and description are required");
      return;
    }
    setSaving(true);
    try {
      await create({
        societyId: societyId as any,
        blockId: blockId as any,
        subject: form.subject,
        description: form.description,
        category: form.category,
        severity: form.severity,
        isAnonymous: form.isAnonymous,
      });
      toast.success("Complaint submitted — the RWA committee will review it");
      setForm({ subject: "", description: "", category: "Other", severity: "minor", isAnonymous: false });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <MessageSquareWarning className="h-5 w-5 text-orange-400" />
          My Complaints
        </h1>
        <Button size="sm" onClick={() => setShowForm(p => !p)} className="bg-orange-600 hover:bg-orange-500">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Complaint
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Submit a complaint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subject *</Label>
                <Input placeholder="e.g. Water leakage in B2 corridor" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description *</Label>
                <Textarea
                  placeholder="Describe the issue in detail…"
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Switch checked={form.isAnonymous} onCheckedChange={v => setForm(p => ({ ...p, isAnonymous: v }))} id="anon" />
                <div>
                  <label htmlFor="anon" className="text-sm font-medium cursor-pointer">Submit anonymously</label>
                  <p className="text-xs text-muted-foreground">Your name will not be shown to the RWA committee</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-500">
                  {saving ? "Submitting…" : "Submit Complaint"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-3">
        {(complaints ?? []).map((c, i) => (
          <motion.div key={c._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.subject}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[c.status] ?? STATUS_COLOR.open}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLOR[c.severity]}`}>
                        {c.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{c.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(c.createdAt)}
                    </div>
                    <button onClick={() => setExpanded(expanded === c._id ? null : c._id)} className="text-muted-foreground hover:text-white">
                      {expanded === c._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expanded === c._id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    {c.rwaResponse ? (
                      <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                        <p className="text-xs font-semibold text-purple-300">RWA Response</p>
                        <p className="text-sm text-purple-100">{c.rwaResponse}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Awaiting RWA response…</p>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {(complaints ?? []).length === 0 && !showForm && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No complaints filed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
