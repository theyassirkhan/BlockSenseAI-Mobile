"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatDateTime, levelColor } from "@/lib/utils";
import {
  Droplets, Zap, Flame, Wind, CreditCard,
  ClipboardList, Bell, CheckCircle2, AlertTriangle, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function ResidentHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const setupDone = useRef(false);

  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    const setup = searchParams.get("setup") as "admin" | "rwa" | "resident" | null;
    if (!setup || setupDone.current) return;
    setupDone.current = true;
    setupDemoUser({ role: setup }).then(() => {
      router.replace("/resident");
    }).catch(console.error);
  }, [searchParams]);

  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const gasLatest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const sewageLatest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const dues = useQuery(api.payments.getMyDues, societyId ? { societyId } : "skip");
  const myRequests = useQuery(api.serviceRequests.getMyRequests, societyId ? { societyId } : "skip");
  const alerts = useQuery(api.alerts.getActiveAlerts, societyId && blockId ? { societyId, blockId } : "skip");

  const pendingDues = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
  const openRequests = (myRequests ?? []).filter(r => r.status === "open" || r.status === "in_progress");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.flatNumber ? `Flat ${profile.flatNumber}` : ""}
        </p>
      </div>

      {/* Action needed banner */}
      {(pendingDues.length > 0 || openRequests.length > 0) && (
        <div className="space-y-2">
          {pendingDues.length > 0 && (
            <Link href="/resident/payments">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between hover:bg-amber-100 transition-colors">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-800">
                    {pendingDues.length} payment{pendingDues.length > 1 ? "s" : ""} pending
                  </span>
                </div>
                <span className="text-xs text-amber-700">Pay now →</span>
              </div>
            </Link>
          )}
          {openRequests.length > 0 && (
            <Link href="/resident/requests">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium text-blue-800">
                    {openRequests.length} request{openRequests.length > 1 ? "s" : ""} in progress
                  </span>
                </div>
                <span className="text-xs text-blue-700">Track →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Utility status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/resident/utilities">
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
                  <Progress value={tanks[0].currentLevelPct} className="mt-2" indicatorColor={levelColor(tanks[0].currentLevelPct)} />
                </>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/resident/utilities">
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
                  <p className="text-xs text-muted-foreground mt-0.5">{dgPred[0].hoursRemaining}h left</p>
                </>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/resident/utilities">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Gas</CardTitle>
                <Flame className="h-4 w-4" style={{ color: "#0F6E56" }} />
              </div>
            </CardHeader>
            <CardContent>
              {gasLatest ? (
                <p className="text-2xl font-bold">{gasLatest.pressurePSI} <span className="text-sm font-normal text-muted-foreground">PSI</span></p>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/resident/utilities">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Sewage</CardTitle>
                <Wind className="h-4 w-4" style={{ color: "#993C1D" }} />
              </div>
            </CardHeader>
            <CardContent>
              {sewageLatest ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sewageLatest.stpStatus === "normal" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {sewageLatest.stpStatus === "normal" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {sewageLatest.stpStatus}
                </div>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4 text-warning" />
                Society alerts
                <Badge variant="warning">{alerts.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <li key={alert._id} className="flex items-start gap-2 text-sm">
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-critical" : "bg-warning"}`} />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(alert.triggeredAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
