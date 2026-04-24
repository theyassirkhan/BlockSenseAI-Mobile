"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquareWarning, ChevronDown, ChevronUp, Search, Send } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_OPTIONS = ["open", "under_review", "resolved", "escalated"] as const;

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

  const complaints = useQuery(api.complaints.getBySociety, societyId ? { societyId } : "skip");

  const respond = useMutation(api.complaints.respond);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = (complaints ?? []).filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    const q = search.toLowerCase();
    if (q && !c.subject.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = {
    open: (complaints ?? []).filter(c => c.status === "open").length,
    under_review: (complaints ?? []).filter(c => c.status === "under_review").length,
    escalated: (complaints ?? []).filter(c => c.status === "escalated").length,
    resolved: (complaints ?? []).filter(c => c.status === "resolved").length,
  };

  async function handleRespond(id: string) {
    const rwaResponse = responses[id]?.trim();
    const status = (statuses[id] ?? "under_review") as any;
    if (!rwaResponse) { toast.error("Enter a response"); return; }
    setSaving(id);
    try {
      await respond({ complaintId: id as any, rwaResponse, status });
      toast.success("Response saved");
      setResponses(p => { const n = { ...p }; delete n[id]; return n; });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <MessageSquareWarning className="h-5 w-5 text-orange-400" />
        Complaints
      </h1>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Open", key: "open", color: "#F59E0B" },
          { label: "Under Review", key: "under_review", color: "#3B82F6" },
          { label: "Escalated", key: "escalated", color: "#EF4444" },
          { label: "Resolved", key: "resolved", color: "#22C55E" },
        ].map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
            style={{
              background: filterStatus === key ? `${color}20` : "rgba(255,255,255,0.04)",
              borderColor: filterStatus === key ? color : "rgba(255,255,255,0.1)",
              color: filterStatus === key ? color : "rgba(255,255,255,0.5)",
            }}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${color}30` }}>
              {counts[key as keyof typeof counts]}
            </span>
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 w-44 text-xs" />
        </div>
      </div>

      {/* Complaints list */}
      <div className="space-y-3">
        {filtered.map((c, i) => (
          <motion.div key={c._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.subject}</p>
                      {c.isAnonymous && <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">Anonymous</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[c.status]}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEVERITY_COLOR[c.severity]}`}>
                        {c.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.category}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => setExpanded(expanded === c._id ? null : c._id)} className="text-muted-foreground hover:text-white shrink-0">
                    {expanded === c._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {expanded === c._id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <p className="text-sm text-muted-foreground">{c.description}</p>

                    {c.rwaResponse && (
                      <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                        <p className="text-xs font-semibold text-purple-300">Previous response</p>
                        <p className="text-sm text-purple-100">{c.rwaResponse}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Select value={statuses[c._id] ?? c.status} onValueChange={v => setStatuses(p => ({ ...p, [c._id]: v }))}>
                          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        rows={3}
                        placeholder="Type your response to the resident…"
                        value={responses[c._id] ?? ""}
                        onChange={e => setResponses(p => ({ ...p, [c._id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRespond(c._id)}
                        disabled={saving === c._id}
                        className="bg-purple-600 hover:bg-purple-500"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {saving === c._id ? "Saving…" : "Send Response"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No complaints {filterStatus !== "all" ? `with status "${filterStatus.replace("_", " ")}"` : "yet"}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
