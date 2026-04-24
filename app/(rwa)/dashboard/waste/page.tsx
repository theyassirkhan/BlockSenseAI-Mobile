"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Loader2, Trophy, CheckCircle2, XCircle } from "lucide-react";
import { GlassStatCard } from "@/components/ui/glass-stat-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { format } from "date-fns";
import { motion } from "framer-motion";

const schema = z.object({
  dryWasteKG: z.coerce.number().min(0),
  wetWasteKG: z.coerce.number().min(0),
  segregationOk: z.boolean(),
});
type Form = z.infer<typeof schema>;

const TOOLTIP_STYLE = { background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 };

export default function WastePage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const logs = useQuery(api.waste.getRecentLogs, societyId && blockId ? { societyId, blockId, days: 30 } : "skip");
  const leaderboard = useQuery(api.waste.getComplianceLeaderboard, societyId ? { societyId } : "skip");
  const logWaste = useMutation(api.waste.logWaste);

  const [showForm, setShowForm] = useState(false);
  const [segregation, setSegregation] = useState(true);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { segregationOk: true } });

  async function onSubmit(data: Form) {
    if (!societyId || !blockId) return;
    try {
      await logWaste({ ...data, societyId, blockId });
      toast.success("Waste logged");
      form.reset();
      setShowForm(false);
    } catch {
      toast.error("Failed to log waste");
    }
  }

  const chartData = logs?.slice().reverse().slice(-14).map(l => ({
    date: format(new Date(l.loggedAt), "dd MMM"),
    Dry: parseFloat(l.dryWasteKG.toFixed(1)),
    Wet: parseFloat(l.wetWasteKG.toFixed(1)),
  })) ?? [];

  const totalDry = logs?.reduce((s, l) => s + l.dryWasteKG, 0) ?? 0;
  const totalWet = logs?.reduce((s, l) => s + l.wetWasteKG, 0) ?? 0;
  const totalKG = totalDry + totalWet;
  const compliance = logs && logs.length > 0
    ? Math.round(logs.filter(l => l.segregationOk).length / logs.length * 100)
    : 0;

  const pieData = totalKG > 0
    ? [{ name: "Dry", value: parseFloat(totalDry.toFixed(1)) }, { name: "Wet", value: parseFloat(totalWet.toFixed(1)) }]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Trash2 className="h-5 w-5" style={{ color: "#E879A0" }} />
          Solid Waste
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(p => !p)} className="border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Log waste
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily waste entry</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dry waste (KG)</Label>
                  <Input type="number" step="0.1" {...form.register("dryWasteKG")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Wet waste (KG)</Label>
                  <Input type="number" step="0.1" {...form.register("wetWasteKG")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Segregation OK?</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={segregation} onCheckedChange={v => { setSegregation(v); form.setValue("segregationOk", v); }} />
                    <span className="text-sm">{segregation ? "Yes" : "No"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassStatCard label="Dry waste" value={`${totalDry.toFixed(1)} KG`} sub="30 days" icon={Trash2} color="#E879A0" index={0} />
        <GlassStatCard label="Wet waste" value={`${totalWet.toFixed(1)} KG`} sub="30 days" icon={Trash2} color="#34D399" index={1} />
        <GlassStatCard label="Total" value={`${totalKG.toFixed(1)} KG`} sub="combined" icon={Trash2} color="#A855F7" index={2} />
        <GlassStatCard
          label="Compliance"
          value={`${compliance}%`}
          sub={compliance >= 80 ? "Excellent" : compliance >= 50 ? "Needs work" : "Poor"}
          icon={compliance >= 80 ? CheckCircle2 : XCircle}
          color={compliance >= 80 ? "#22C55E" : compliance >= 50 ? "#F59E0B" : "#EF4444"}
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bar chart */}
        <ScrollReveal delay={0.1} className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">14-day waste log (KG)</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="Dry" stackId="a" fill="#E879A0" name="Dry (KG)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Wet" stackId="a" fill="#34D399" name="Wet (KG)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Donut chart */}
        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Dry vs Wet split</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      <Cell fill="#E879A0" />
                      <Cell fill="#34D399" />
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} KG`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <ScrollReveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Block segregation leaderboard (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard.map((entry, i) => {
                const color = entry.compliancePct >= 80 ? "#22C55E" : entry.compliancePct >= 50 ? "#F59E0B" : "#EF4444";
                return (
                  <motion.div key={entry.blockId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold w-5 text-right" style={{ color: i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : i === 2 ? "#CD7C2F" : "rgba(255,255,255,0.3)" }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{entry.blockName}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs text-muted-foreground">{entry.totalKG} KG</span>
                            <span className="text-xs font-bold" style={{ color }}>{entry.compliancePct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${entry.compliancePct}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.05 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Recent logs */}
      {logs && logs.length > 0 && (
        <ScrollReveal delay={0.25}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent entries</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Date", "Dry (KG)", "Wet (KG)", "Total (KG)", "Segregation"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 10).map(l => (
                      <tr key={l._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{format(new Date(l.loggedAt), "dd MMM yyyy")}</td>
                        <td className="px-4 py-2.5 text-pink-300">{l.dryWasteKG.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-emerald-300">{l.wetWasteKG.toFixed(1)}</td>
                        <td className="px-4 py-2.5 font-medium">{l.totalKG.toFixed(1)}</td>
                        <td className="px-4 py-2.5">
                          {l.segregationOk
                            ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                            : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> No</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}
