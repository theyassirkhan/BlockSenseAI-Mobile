"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Clock, CheckCircle2, Share2, QrCode, CalendarClock, ExternalLink, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(v: any) {
  if (v.checkedOutAt) return <Badge variant="secondary" className="text-[10px]">Left</Badge>;
  if (v.checkedInAt) return <Badge className="bg-green-700 text-green-200 text-[10px]">Inside</Badge>;
  return <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400">Expected</Badge>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://block-sense-ai-mobile-muhammedyassirkhan-6475s-projects.vercel.app";

export default function VisitorsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const visitors = useQuery(api.visitors.getMyVisitors, societyId ? { societyId } : "skip");
  const register = useMutation(api.visitors.register);

  const [form, setForm] = useState({ visitorName: "", visitorPhone: "", expectedAt: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [qrVisitor, setQrVisitor] = useState<any>(null);

  // Real-time check-in notification
  const prevCheckedIn = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!visitors) return;
    visitors.forEach(v => {
      if (v.checkedInAt && !prevCheckedIn.current.has(v._id)) {
        if (prevCheckedIn.current.size > 0) {
          toast.success(`🚪 ${v.visitorName} has entered the society and is heading your way!`, {
            duration: 8000,
          });
        }
        prevCheckedIn.current.add(v._id);
      }
    });
  }, [visitors]);

  async function handleSubmit() {
    if (!societyId || !form.visitorName || !form.visitorPhone || !form.expectedAt) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const result = await register({
        societyId: societyId as any,
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        expectedAt: new Date(form.expectedAt).getTime(),
      });

      // Auto-send the gate pass to the visitor via WhatsApp
      sharePass({
        passCode: result?.passCode ?? "",
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        expectedAt: new Date(form.expectedAt).getTime(),
      });

      toast.success("Gate pass sent to guest via WhatsApp!");
      setForm({ visitorName: "", visitorPhone: "", expectedAt: "" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function sharePass(v: any) {
    const url = `${APP_URL}/gatepass/${v.passCode}`;
    const msg = `Hi ${v.visitorName}! Here's your BlockSense gate pass for Flat ${profile?.flatNumber ?? "my flat"}. Expected: ${formatTime(v.expectedAt)}.\n\nOpen gate pass: ${url}`;
    if (navigator.share) {
      navigator.share({ title: "BlockSense Gate Pass", text: msg, url }).catch(() => {});
    } else {
      const wa = `https://wa.me/${v.visitorPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(wa, "_blank");
    }
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

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-purple-400" /> Invite a guest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Guest name *</Label>
                    <Input placeholder="Raju Kumar" value={form.visitorName} onChange={e => setForm(p => ({ ...p, visitorName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mobile number *</Label>
                    <Input type="tel" placeholder="+91 98765 43210" value={form.visitorPhone} onChange={e => setForm(p => ({ ...p, visitorPhone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expected arrival *</Label>
                  <Input type="datetime-local" value={form.expectedAt} onChange={e => setForm(p => ({ ...p, expectedAt: e.target.value }))} />
                </div>
                <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <QrCode className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-purple-300">A branded QR gate pass will be sent to the guest via WhatsApp and SMS automatically.</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
                    {saving ? "Sending…" : "Send Gate Pass"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active / Upcoming</p>
          {upcoming.map((v, i) => (
            <motion.div key={v._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={v.checkedInAt ? "ring-1 ring-green-500/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{v.visitorName}</p>
                        {statusBadge(v)}
                        {v.gatepassSent && (
                          <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Pass sent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{v.visitorPhone}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expected: {formatTime(v.expectedAt)}
                      </div>
                      {v.checkedInAt && (
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <Bell className="h-3 w-3" /> Checked in at {formatTime(v.checkedInAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="font-mono text-base font-bold text-purple-300 tracking-widest">{v.passCode}</div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setQrVisitor(v)}
                          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-lg transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5" /> QR
                        </button>
                        <button
                          onClick={() => sharePass(v)}
                          className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Share2 className="h-3 w-3" /> Share
                        </button>
                      </div>
                    </div>
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

      {/* QR Gate Pass Modal */}
      <Dialog open={!!qrVisitor} onOpenChange={() => setQrVisitor(null)}>
        <DialogContent className="p-0 max-w-sm border-purple-500/30 bg-transparent shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Gate Pass</DialogTitle>
          </DialogHeader>
          {qrVisitor && (
            <div className="rounded-2xl overflow-hidden">
              <iframe
                src={`/gatepass/${qrVisitor.passCode}`}
                className="w-full border-0"
                style={{ height: "560px" }}
                title="Gate Pass"
              />
              <div className="bg-[#0f0829] px-4 py-3 flex justify-between items-center border-t border-purple-500/20">
                <button onClick={() => sharePass(qrVisitor)} className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300">
                  <Share2 className="h-4 w-4" /> Share Pass
                </button>
                <a
                  href={`/gatepass/${qrVisitor.passCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  Full page <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
