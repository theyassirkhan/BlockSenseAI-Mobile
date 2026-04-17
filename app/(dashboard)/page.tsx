"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatDateTime, levelColor, daysFromNow } from "@/lib/utils";
import {
  Droplets, Zap, AlertTriangle, CheckCircle2, Flame, Wind,
  Trash2, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const color =
    score >= 85 ? "#22c55e" : score >= 70 ? "#84cc16" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs attention";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 201} 201`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-xs font-semibold" style={{ color }}>{grade}</span>
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Society Health Score</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
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
    setupDemoUser({ role: setup }).then(() => {
      router.replace("/");
    }).catch(console.error);
  }, [searchParams]);

  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(
    api.water.getTankLevels,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const waterPred = useQuery(
    api.water.getWaterPrediction,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const dgPred = useQuery(
    api.power.getDieselPrediction,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const alerts = useQuery(
    api.alerts.getActiveAlerts,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const gasLatest = useQuery(
    api.gas.getLatest,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const sewageLatest = useQuery(
    api.sewage.getLatest,
    societyId && blockId ? { societyId, blockId } : "skip"
  );
  const healthScore = useQuery(
    api.societies.getHealthScore,
    societyId && blockId ? { societyId, blockId } : "skip"
  );

  const isLoading = !profile || !tanks;
  const criticalAlerts = alerts?.filter((a) => a.severity === "critical") ?? [];

  async function handleSeedData() {
    setSeeding(true);
    try {
      const result = await seedAllDemoData({});
      if ((result as any)?.skipped) {
        toast.info("Demo data already seeded");
      } else {
        toast.success("90 days of demo data seeded successfully");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-count-up">
      {/* Alert banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-critical shrink-0" />
            <span className="text-sm font-medium text-critical">
              {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} — {criticalAlerts[0]?.title}
            </span>
          </div>
          <Link href="/alerts" className="text-xs font-medium text-critical hover:underline">View all →</Link>
        </div>
      )}

      {/* Health score + seed button row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {healthScore ? (
          <HealthGauge score={healthScore.score} grade={healthScore.grade} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Society health will appear once data is logged.
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSeedData}
          disabled={seeding}
          className="shrink-0"
        >
          {seeding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
          Load demo data
        </Button>
      </div>

      {/* Quick-stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Water */}
        <Link href="/water">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Water</CardTitle>
                <Droplets className="h-4 w-4" style={{ color: "#185FA5" }} />
              </div>
            </CardHeader>
            <CardContent>
              {tanks && tanks.length > 0 ? (
                <>
                  <p className="text-2xl font-bold" style={{ color: levelColor(tanks[0].currentLevelPct) }}>
                    {tanks[0].currentLevelPct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{tanks[0].name}</p>
                  <Progress value={tanks[0].currentLevelPct} className="mt-2" indicatorColor={levelColor(tanks[0].currentLevelPct)} />
                </>
              ) : <p className="text-xs text-muted-foreground">No tanks</p>}
            </CardContent>
          </Card>
        </Link>

        {/* Power */}
        <Link href="/power">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Diesel</CardTitle>
                <Zap className="h-4 w-4" style={{ color: "#854F0B" }} />
              </div>
            </CardHeader>
            <CardContent>
              {dgPred && dgPred.length > 0 ? (
                <>
                  <p className="text-2xl font-bold" style={{ color: levelColor(dgPred[0].levelPct) }}>
                    {dgPred[0].levelPct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dgPred[0].hoursRemaining}h remaining</p>
                  <Progress value={dgPred[0].levelPct} className="mt-2" indicatorColor={levelColor(dgPred[0].levelPct)} />
                </>
              ) : <p className="text-xs text-muted-foreground">No DG units</p>}
            </CardContent>
          </Card>
        </Link>

        {/* Gas */}
        <Link href="/gas">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Gas</CardTitle>
                <Flame className="h-4 w-4" style={{ color: "#0F6E56" }} />
              </div>
            </CardHeader>
            <CardContent>
              {gasLatest ? (
                <>
                  <p className="text-2xl font-bold">
                    {gasLatest.pressurePSI} <span className="text-sm font-normal text-muted-foreground">PSI</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(gasLatest.recordedAt)}</p>
                </>
              ) : <p className="text-xs text-muted-foreground">No readings</p>}
            </CardContent>
          </Card>
        </Link>

        {/* Sewage */}
        <Link href="/sewage">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Sewage</CardTitle>
                <Wind className="h-4 w-4" style={{ color: "#993C1D" }} />
              </div>
            </CardHeader>
            <CardContent>
              {sewageLatest ? (
                <>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sewageLatest.stpStatus === "normal" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {sewageLatest.stpStatus === "normal" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {sewageLatest.stpStatus}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Sludge: {sewageLatest.sludgeTankPct}%</p>
                </>
              ) : <p className="text-xs text-muted-foreground">No readings</p>}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Water prediction + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water prediction */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-4 w-4" style={{ color: "#185FA5" }} />
                Water outlook
              </CardTitle>
              <Link href="/water" className="text-xs text-primary hover:underline">Details →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {waterPred ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Days until critical</p>
                    <p className="text-2xl font-bold" style={{ color: waterPred.daysUntilCritical < 3 ? "#A32D2D" : waterPred.daysUntilCritical < 7 ? "#BA7517" : "#3B6D11" }}>
                      {waterPred.daysUntilCritical}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Avg daily use</p>
                    <p className="text-2xl font-bold">{waterPred.avgDailyConsumption} <span className="text-sm font-normal">KL</span></p>
                  </div>
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <p className="text-xs text-muted-foreground">Recommended order</p>
                  <p className="text-xs font-semibold">{daysFromNow(waterPred.recommendedOrderDate)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add water readings to see predictions.</p>
            )}
          </CardContent>
        </Card>

        {/* Active alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Active alerts
                {alerts && alerts.length > 0 && (
                  <Badge variant={criticalAlerts.length > 0 ? "critical" : "warning"} className="ml-1">{alerts.length}</Badge>
                )}
              </CardTitle>
              <Link href="/alerts" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!alerts || alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All clear — no active alerts
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <li key={alert._id} className="flex items-start gap-2 text-sm">
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-critical" : alert.severity === "warning" ? "bg-warning" : "bg-blue-500"}`} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(alert.triggeredAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health breakdown */}
      {healthScore && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Health score breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Water level", value: healthScore.breakdown.water, max: 40 },
                { label: "No critical alerts", value: healthScore.breakdown.alerts, max: 30 },
                { label: "Waste segregation", value: healthScore.breakdown.waste, max: 30 },
              ].map(({ label, value, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}/{max}</span>
                  </div>
                  <Progress value={(value / max) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
