"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Loader2, Square, Play, Fuel } from "lucide-react";
import { formatDateTime, levelColor, formatDate } from "@/lib/utils";
import { format } from "date-fns";

const readingSchema = z.object({
  source: z.enum(["grid", "solar", "dg"]),
  readingType: z.enum(["generation", "consumption", "export"]),
  valueKWH: z.coerce.number().positive(),
});

const refuelSchema = z.object({
  dgUnitId: z.string().min(1),
  litersAdded: z.coerce.number().positive(),
  cost: z.coerce.number().optional(),
});

type ReadingForm = z.infer<typeof readingSchema>;
type RefuelForm = z.infer<typeof refuelSchema>;

export default function PowerPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const readings = useQuery(api.power.getRecentPowerReadings, societyId && blockId ? { societyId, blockId, days: 7 } : "skip");
  const activeOutage = useQuery(api.power.getActiveOutage, societyId && blockId ? { societyId, blockId } : "skip");

  const addReading = useMutation(api.power.addPowerReading);
  const startOutage = useMutation(api.power.startOutage);
  const endOutage = useMutation(api.power.endOutage);
  const refuelDG = useMutation(api.power.refuelDG);

  const [showReadingForm, setShowReadingForm] = useState(false);
  const [showRefuelForm, setShowRefuelForm] = useState(false);

  const readingForm = useForm<ReadingForm>({ resolver: zodResolver(readingSchema), defaultValues: { source: "grid", readingType: "consumption" } });
  const refuelForm = useForm<RefuelForm>({ resolver: zodResolver(refuelSchema) });

  async function onReadingSubmit(data: ReadingForm) {
    if (!societyId || !blockId) return;
    try {
      await addReading({ ...data, societyId, blockId });
      toast.success("Reading logged");
      readingForm.reset();
      setShowReadingForm(false);
    } catch {
      toast.error("Failed to log reading");
    }
  }

  async function onRefuelSubmit(data: RefuelForm) {
    try {
      await refuelDG({ dgUnitId: data.dgUnitId as any, litersAdded: data.litersAdded, cost: data.cost });
      toast.success("DG refuelled");
      refuelForm.reset();
      setShowRefuelForm(false);
    } catch {
      toast.error("Failed to log refuel");
    }
  }

  async function handleStartOutage(dgUnitId?: string) {
    if (!societyId || !blockId) return;
    try {
      await startOutage({ societyId, blockId, dgUnitId: dgUnitId as any });
      toast.success("Outage started");
    } catch {
      toast.error("Failed to log outage");
    }
  }

  async function handleEndOutage() {
    if (!activeOutage) return;
    try {
      await endOutage({ outageId: activeOutage._id });
      toast.success("Outage ended");
    } catch {
      toast.error("Failed to end outage");
    }
  }

  // Chart data
  const consumptionByDay = (() => {
    if (!readings) return [];
    const byDay: Record<string, number> = {};
    readings.filter(r => r.readingType === "consumption").forEach(r => {
      const d = format(new Date(r.recordedAt), "dd MMM");
      byDay[d] = (byDay[d] ?? 0) + r.valueKWH;
    });
    return Object.entries(byDay).map(([date, value]) => ({ date, value })).slice(-7);
  })();

  if (!dgPred) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Zap className="h-5 w-5" style={{ color: "#854F0B" }} />
          Power Management
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReadingForm(p => !p)}>Log reading</Button>
          <Button variant="outline" size="sm" onClick={() => setShowRefuelForm(p => !p)}>
            <Fuel className="h-3.5 w-3.5 mr-1" />Refuel DG
          </Button>
          {activeOutage ? (
            <Button size="sm" variant="destructive" onClick={handleEndOutage}>
              <Square className="h-3.5 w-3.5 mr-1" />End outage
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleStartOutage(dgPred?.[0]?.dgId as string)}>
              <Play className="h-3.5 w-3.5 mr-1" />Log outage
            </Button>
          )}
        </div>
      </div>

      {/* Active outage banner */}
      {activeOutage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-critical rounded-full animate-pulse" />
            <span className="text-sm font-medium text-critical">
              Power outage in progress since {formatDateTime(activeOutage.startedAt)}
            </span>
          </div>
          <Button size="sm" variant="destructive" onClick={handleEndOutage}>End outage</Button>
        </div>
      )}

      {/* Reading form */}
      {showReadingForm && (
        <Card>
          <CardHeader><CardTitle>Log power reading</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={readingForm.handleSubmit(onReadingSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Select defaultValue="grid" onValueChange={v => readingForm.setValue("source", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="dg">DG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select defaultValue="consumption" onValueChange={v => readingForm.setValue("readingType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumption">Consumption</SelectItem>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value (kWh)</Label>
                <Input type="number" step="0.01" placeholder="0.0" {...readingForm.register("valueKWH")} />
              </div>
              <div className="space-y-1 flex items-end">
                <Button type="submit" size="sm" disabled={readingForm.formState.isSubmitting} className="w-full">
                  {readingForm.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Refuel form */}
      {showRefuelForm && (
        <Card>
          <CardHeader><CardTitle>Log diesel refuel</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={refuelForm.handleSubmit(onRefuelSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">DG Unit</Label>
                <Select onValueChange={v => refuelForm.setValue("dgUnitId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select DG" /></SelectTrigger>
                  <SelectContent>
                    {dgPred?.map(d => <SelectItem key={d.dgId as string} value={d.dgId as string}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Litres added</Label>
                <Input type="number" placeholder="100" {...refuelForm.register("litersAdded")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost (₹)</Label>
                <Input type="number" placeholder="Optional" {...refuelForm.register("cost")} />
              </div>
              <div className="col-span-2 md:col-span-4 flex gap-2">
                <Button type="submit" size="sm">Save</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowRefuelForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DG gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {dgPred?.map(dg => {
          const color = levelColor(dg.levelPct);
          const data = [{ name: dg.name, value: dg.levelPct, fill: color }];
          return (
            <Card key={dg.dgId as string}>
              <CardContent className="pt-5">
                <div className="flex flex-col items-center">
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="60%" outerRadius="90%" data={data} startAngle={220} endAngle={-40}>
                        <RadialBar dataKey="value" background={{ fill: "#f4f4f4" }} cornerRadius={6} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="-mt-10 text-center">
                    <p className="text-2xl font-bold" style={{ color }}>{dg.levelPct}%</p>
                    <p className="text-xs text-muted-foreground">{Math.round(dg.dieselLevelLiters)}L / {dg.dieselCapacityLiters}L</p>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-semibold">{dg.name}</p>
                    <p className="text-xs text-muted-foreground">{dg.hoursRemaining}h remaining</p>
                    {dg.isRunning && <Badge variant="warning" className="mt-1">Running</Badge>}
                    {dg.isCritical && <Badge variant="critical" className="mt-1">Refuel now</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {dgPred?.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">No DG units configured.</div>
        )}
      </div>

      {/* Consumption chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">7-day power consumption (kWh)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={consumptionByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} kWh`, "Consumption"]} />
              <Bar dataKey="value" fill="#854F0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
