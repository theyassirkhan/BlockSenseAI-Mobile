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
import { UserPlus, Clock, CheckCircle2, Share2, Copy, CalendarClock } from "lucide-react";
import { motion } from "framer-motion";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(v: any) {
  if (v.checkedOutAt) return <Badge variant="secondary" className="text-[10px]">Left</Badge>;
  if (v.checkedInAt) return <Badge className="bg-green-700 text-green-200 text-[10px]">Inside</Badge>;
  return <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400">Expected</Badge>;
}

export default function VisitorsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const visitors = useQuery(api.visitors.getMyVisitors, societyId ? { societyId } : "skip");
  const register = useMutation(api.visitors.register);

  const [form, setForm] = useState({ visitorName: "", visitorPhone: "", expectedAt: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit() {
    if (!societyId || !form.visitorName || !form.visitorPhone || !form.expectedAt) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await register({
        societyId: societyId as any,
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        expectedAt: new Date(form.expectedAt).getTime(),
      });
      toast.success("Visitor registered — share the pass code with them");
      setForm({ visitorName: "", visitorPhone: "", expectedAt: "" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function sharePass(v: any) {
    const msg = `Hi ${v.visitorName}, your BlockSense visitor pass for ${profile?.flatNumber ?? "our flat"} is: *${v.passCode}*. Show this code at the gate. Expected: ${formatTime(v.expectedAt)}.`;
    const url = `https://wa.me/${v.visitorPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Pass code copied");
  }

  const upcoming = (visitors ?? []).filter(v => !v.checkedOutAt);
  const past = (visitors ?? []).filter(v => v.checkedOutAt);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-purple-400" />
          My Visitors
        </h1>
        <Button size="sm" onClick={() => setShowForm(p => !p)} className="bg-purple-600 hover:bg-purple-500">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Invite Guest
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-purple-400" /> Pre-register a visitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Visitor name *</Label>
                  <Input placeholder="Raju Kumar" value={form.visitorName} onChange={e => setForm(p => ({ ...p, visitorName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone number *</Label>
                  <Input type="tel" placeholder="+91 98765 43210" value={form.visitorPhone} onChange={e => setForm(p => ({ ...p, visitorPhone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expected arrival *</Label>
                <Input type="datetime-local" value={form.expectedAt} onChange={e => setForm(p => ({ ...p, expectedAt: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
                  {saving ? "Registering…" : "Register & Get Pass Code"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active / Upcoming</p>
          {upcoming.map((v, i) => (
            <motion.div key={v._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{v.visitorName}</p>
                      {statusBadge(v)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.visitorPhone}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expected: {formatTime(v.expectedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-lg font-bold text-purple-300 tracking-widest">{v.passCode}</span>
                      <button onClick={() => copyCode(v.passCode)} className="text-muted-foreground hover:text-white p-1">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => sharePass(v)}
                      className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300"
                    >
                      <Share2 className="h-3 w-3" /> Share via WhatsApp
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past visits</p>
          {past.slice(0, 10).map(v => (
            <div key={v._id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">{v.visitorName}</p>
                  {statusBadge(v)}
                </div>
                <p className="text-xs text-muted-foreground/60">{formatTime(v.expectedAt)}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {(visitors ?? []).length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No visitors yet. Invite a guest to get started.</p>
        </div>
      )}
    </div>
  );
}
