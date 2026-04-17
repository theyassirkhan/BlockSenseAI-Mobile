"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { levelColor, formatDateTime } from "@/lib/utils";
import { Droplets, Zap, Flame, Wind, Trash2, Truck, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ResidentUtilitiesPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const gasLatest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const sewageLatest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  // waste has no getLatest — unused on this view

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Droplets className="h-5 w-5" />
        Utility Status
      </h1>

      <p className="text-sm text-muted-foreground">Live readings for your block. All data is read-only.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Droplets className="h-4 w-4" style={{ color: "#185FA5" }} />
              Water tanks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tanks && tanks.length > 0 ? tanks.map(tank => (
              <div key={tank._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{tank.name}</span>
                  <span className="font-bold" style={{ color: levelColor(tank.currentLevelPct) }}>{tank.currentLevelPct}%</span>
                </div>
                <Progress value={tank.currentLevelPct} indicatorColor={levelColor(tank.currentLevelPct)} />
                <p className="text-xs text-muted-foreground mt-1">{tank.capacityKL} KL total · updated {formatDateTime(tank.lastUpdated)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No tank data available.</p>}
          </CardContent>
        </Card>

        {/* Power */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" style={{ color: "#854F0B" }} />
              Diesel generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dgPred && dgPred.length > 0 ? dgPred.map(dg => (
              <div key={dg.dgId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{dg.name}</span>
                  <span className="font-bold" style={{ color: levelColor(dg.levelPct) }}>{dg.levelPct}%</span>
                </div>
                <Progress value={dg.levelPct} indicatorColor={levelColor(dg.levelPct)} />
                <p className="text-xs text-muted-foreground mt-1">{dg.hoursRemaining}h remaining · {dg.dieselLevelLiters}L / {dg.dieselCapacityLiters}L</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No DG data available.</p>}
          </CardContent>
        </Card>

        {/* Gas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4" style={{ color: "#0F6E56" }} />
              Piped gas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gasLatest ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pressure</span>
                  <span className="text-lg font-bold">{gasLatest.pressurePSI} <span className="text-sm font-normal text-muted-foreground">PSI</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Meter reading</span>
                  <span className="font-medium">{gasLatest.meterReading} SCM</span>
                </div>
                <p className="text-xs text-muted-foreground">Updated {formatDateTime(gasLatest.recordedAt)}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No gas data available.</p>}
          </CardContent>
        </Card>

        {/* Sewage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wind className="h-4 w-4" style={{ color: "#993C1D" }} />
              Sewage treatment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sewageLatest ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">STP status</span>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sewageLatest.stpStatus === "normal" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {sewageLatest.stpStatus === "normal" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {sewageLatest.stpStatus}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sludge tank</span>
                  <span className="font-medium">{sewageLatest.sludgeTankPct}%</span>
                </div>
                <Progress value={sewageLatest.sludgeTankPct} className="h-1.5" />
              </div>
            ) : <p className="text-sm text-muted-foreground">No sewage data available.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
