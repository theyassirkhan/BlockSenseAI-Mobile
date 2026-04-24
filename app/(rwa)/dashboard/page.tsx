"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GlassStatCard } from "@/components/ui/glass-stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { formatDateTime, levelColor, daysFromNow } from "@/lib/utils";
import {
  Droplets, Zap, AlertTriangle, CheckCircle2, Flame, Wind,
  Sparkles, Loader2,
} from "lucide-react";
import { PdfReportButton } from "@/components/ui/pdf-report";
import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#84cc16" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs attention";

  return (
    <motion.div
      className="flex items-center gap-5 p-5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="201"
            initial={{ strokeDashoffset: 201 }}
            animate={{ strokeDashoffset: 201 - (score / 100) * 201 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-xs font-bold" style={{ color }}>{grade}</span>
        </div>
      </div>
      <div>
        <p className="font-bold text-white text-lg">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Society Health Score</p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Live monitoring</span>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const seedAllDemoData = useMutation(api.demo.seedAllDemoData);
  const setupDone = useRef(false);
  const [seeding, setSeeding] = useState(false);

  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    const setup = searchParams.get("setup") as "admin" | "rwa" | "resident" | null;
    if (!setup || setupDone.current) return;
    setupDone.current = true;
    setupDemoUser({ role: setup })
      .then(() => seedAllDemoData({}))
      .catch(() => {})
      .finally(() => router.replace("/dashboard"));
  }, [searchParams]);

  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const waterPred = useQuery(api.water.getWaterPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const alerts = useQuery(api.alerts.getActiveAlerts, societyId && blockId ? { societyId, blockId } : "skip");
  const gasLatest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const sewageLatest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const healthScore = useQuery(api.societies.getHealthScore, societyId && blockId ? { societyId, blockId } : "skip");

  const isLoading = !profile || !tanks;
  const criticalAlerts = alerts?.filter(a => a.severity === "critical") ?? [];

  async function handleSeedData() {
    setSeeding(true);
    try {
      const result = await seedAllDemoData({});
      if ((result as any)?.skipped) toast.info("Demo data already seeded");
      else toast.success("90 days of demo data seeded successfully");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Water", icon: Droplets, color: "#38BDF8",
      value: tanks && tanks.length > 0 ? `${tanks[0].currentLevelPct}%` : "—",
      sub: tanks && tanks.length > 0 ? tanks[0].name : "No tanks",
      href: "/dashboard/water",
    },
    {
      label: "Diesel", icon: Zap, color: "#F59E0B",
      value: dgPred && dgPred.length > 0 ? `${dgPred[0].levelPct}%` : "—",
      sub: dgPred && dgPred.length > 0 ? `${dgPred[0].hoursRemaining}h remaining` : "No DG units",
      href: "/dashboard/power",
    },
    {
      label: "Gas", icon: Flame, color: "#34D399",
      value: gasLatest ? `${gasLatest.pressurePSI}` : "—",
      sub: gasLatest ? "PSI" : "No readings",
      href: "/dashboard/gas",
    },
    {
      label: "Alerts", icon: AlertTriangle, color: criticalAlerts.length > 0 ? "#EF4444" : "#A855F7",
      value: alerts?.length ?? 0,
      sub: criticalAlerts.length > 0 ? `${criticalAlerts.length} critical` : "All clear",
      href: "/dashboard/alerts",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Critical alert banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-300">
              {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} — {criticalAlerts[0]?.title}
            </span>
          </div>
          <Link href="/dashboard/alerts" className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">View all →</Link>
        </motion.div>
      )}

      {/* Health + seed button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {healthScore ? (
          <HealthGauge score={healthScore.score} grade={healthScore.grade} />
        ) : (
          <motion.div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Sparkles className="h-4 w-4" />
            Society health will appear once data is logged.
          </motion.div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {societyId && blockId && (
            <PdfReportButton societyId={societyId} blockId={blockId} societyName={profile?.name ?? "Society"} />
          )}
          <Button size="sm" variant="outline" onClick={handleSeedData} disabled={seeding} className="border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10">
            {seeding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Load demo data
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, icon, color, value, sub, href }, i) => (
          <Link key={label} href={href}>
            <GlassStatCard label={label} value={value} sub={sub} icon={icon} color={color} index={i} />
          </Link>
        ))}
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScrollReveal delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-400" />
                  Water outlook
                </CardTitle>
                <Link href="/dashboard/water" className="text-xs text-primary hover:underline">Details →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {waterPred ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Days until critical", value: waterPred.daysUntilCritical, color: waterPred.daysUntilCritical < 3 ? "#EF4444" : waterPred.daysUntilCritical < 7 ? "#F59E0B" : "#34D399" },
                      { label: "Avg daily use", value: `${waterPred.avgDailyConsumption} KL`, color: "#A855F7" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
                        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Recommended order</p>
                    <p className="text-xs font-semibold text-white">{daysFromNow(waterPred.recommendedOrderDate)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Add water readings to see predictions.</p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Active alerts
                  {alerts && alerts.length > 0 && (
                    <Badge variant={criticalAlerts.length > 0 ? "critical" : "warning"} className="ml-1">{alerts.length}</Badge>
                  )}
                </CardTitle>
                <Link href="/dashboard/alerts" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {!alerts || alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  All clear — no active alerts
                </div>
              ) : (
                <ul className="space-y-2">
                  {alerts.slice(0, 4).map((alert, i) => (
                    <motion.li
                      key={alert._id}
                      className="flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-white/5"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-400" : alert.severity === "warning" ? "bg-yellow-400" : "bg-blue-400"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{formatDateTime(alert.triggeredAt)}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Health score breakdown */}
      {healthScore && (
        <ScrollReveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Health score breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: "Water level", value: healthScore.breakdown.water, max: 40, color: "#38BDF8" },
                  { label: "No critical alerts", value: healthScore.breakdown.alerts, max: 30, color: "#A855F7" },
                  { label: "Waste segregation", value: healthScore.breakdown.waste, max: 30, color: "#34D399" },
                ].map(({ label, value, max, color }, i) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <div className="flex justify-between text-xs mb-2">
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
                      <span className="font-semibold text-white">{value}/{max}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(value / max) * 100}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  );
}
