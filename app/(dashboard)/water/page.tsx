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
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Plus, Loader2, TrendingDown, Calendar, Truck } from "lucide-react";
import { formatDate, daysFromNow, levelColor, formatKL } from "@/lib/utils";
import { format } from "date-fns";

const readingSchema = z.object({
  source: z.enum(["cauvery", "borewell", "tanker", "rainwater"]),
  readingType: z.enum(["inflow", "consumption", "tank_level"]),
  value: z.coerce.number().positive("Value must be positive"),
  notes: z.string().optional(),
});

const tankerSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  quantityKL: z.coerce.number().positive(),
  scheduledAt: z.string().optional(),
});

type ReadingForm = z.infer<typeof readingSchema>;
type TankerForm = z.infer<typeof tankerSchema>;

const SOURCE_COLORS: Record<string, string> = {
  cauvery: "#185FA5",
  borewell: "#854F0B",
  tanker: "#BA7517",
  rainwater: "#3B6D11",
};

export default function WaterPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const readings = useQuery(api.water.getRecentReadings, societyId && blockId ? { societyId, blockId, days: 7 } : "skip");
  const prediction = useQuery(api.water.getWaterPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const orders = useQuery(api.water.getTankerOrders, societyId && blockId ? { societyId, blockId } : "skip");
  const vendors = useQuery(api.vendors.getBySociety, societyId ? { societyId, type: "water_tanker" } : "skip");

  const addReading = useMutation(api.water.addWaterReading);
  const createOrder = useMutation(api.water.createTankerOrder);

  const [showReadingForm, setShowReadingForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const readingForm = useForm<ReadingForm>({ resolver: zodResolver(readingSchema), defaultValues: { source: "cauvery", readingType: "consumption" } });
  const tankerForm = useForm<TankerForm>({ resolver: zodResolver(tankerSchema) });

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

  async function onTankerSubmit(data: TankerForm) {
    if (!societyId || !blockId) return;
    try {
      await createOrder({
        societyId, blockId,
        vendorId: data.vendorId as any,
        quantityKL: data.quantityKL,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).getTime() : undefined,
        triggeredBy: "manual",
      });
      toast.success("Tanker order placed");
      tankerForm.reset();
      setShowOrderForm(false);
    } catch {
      toast.error("Failed to place order");
    }
  }

  // Chart data
  const consumptionByDay = (() => {
    if (!readings) return [];
    const byDay: Record<string, number> = {};
    readings.filter(r => r.readingType === "consumption").forEach(r => {
      const d = format(new Date(r.recordedAt), "dd MMM");
      byDay[d] = (byDay[d] ?? 0) + r.value;
    });
    return Object.entries(byDay).map(([date, value]) => ({ date, value })).slice(-7);
  })();

  const sourceBreakdown = (() => {
    if (!readings) return [];
    const bySource: Record<string, number> = {};
    readings.forEach(r => {
      bySource[r.source] = (bySource[r.source] ?? 0) + r.value;
    });
    return Object.entries(bySource).map(([name, value]) => ({ name, value }));
  })();

  const avgConsumption = consumptionByDay.length > 0
    ? consumptionByDay.reduce((s, d) => s + d.value, 0) / consumptionByDay.length
    : 0;

  const STATUS_COLORS: Record<string, string> = {
    pending: "warning",
    confirmed: "info",
    delivered: "success",
    cancelled: "secondary",
  };

  if (!tanks) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Droplets className="h-5 w-5" style={{ color: "#185FA5" }} />
          Water Management
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReadingForm(p => !p)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Log reading
          </Button>
          <Button size="sm" onClick={() => setShowOrderForm(p => !p)}>
            <Truck className="h-3.5 w-3.5 mr-1" />Order tanker
          </Button>
        </div>
      </div>

      {/* Reading form */}
      {showReadingForm && (
        <Card>
          <CardHeader><CardTitle>Log water reading</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={readingForm.handleSubmit(onReadingSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Select defaultValue="cauvery" onValueChange={v => readingForm.setValue("source", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cauvery">Cauvery</SelectItem>
                    <SelectItem value="borewell">Borewell</SelectItem>
                    <SelectItem value="tanker">Tanker</SelectItem>
                    <SelectItem value="rainwater">Rainwater</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select defaultValue="consumption" onValueChange={v => readingForm.setValue("readingType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inflow">Inflow</SelectItem>
                    <SelectItem value="consumption">Consumption</SelectItem>
                    <SelectItem value="tank_level">Tank level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value (KL)</Label>
                <Input type="number" step="0.1" placeholder="0.0" {...readingForm.register("value")} />
                {readingForm.formState.errors.value && <p className="text-xs text-destructive">{readingForm.formState.errors.value.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input placeholder="Optional" {...readingForm.register("notes")} />
              </div>
              <div className="col-span-2 md:col-span-4 flex gap-2">
                <Button type="submit" size="sm" disabled={readingForm.formState.isSubmitting}>
                  {readingForm.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowReadingForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tanker order form */}
      {showOrderForm && (
        <Card>
          <CardHeader><CardTitle>Order water tanker</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={tankerForm.handleSubmit(onTankerSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Vendor</Label>
                <Select onValueChange={v => tankerForm.setValue("vendorId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.sort((a, b) => (b.isPreferred ? 1 : 0) - (a.isPreferred ? 1 : 0)).map(v => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.name} {v.isPreferred && "⭐"} {v.ratePerUnit ? `— ₹${v.ratePerUnit}/${v.unit}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tankerForm.formState.errors.vendorId && <p className="text-xs text-destructive">{tankerForm.formState.errors.vendorId.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity (KL)</Label>
                <Input type="number" placeholder="10" {...tankerForm.register("quantityKL")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Scheduled date</Label>
                <Input type="date" {...tankerForm.register("scheduledAt")} />
              </div>
              <div className="col-span-2 md:col-span-4 flex gap-2">
                <Button type="submit" size="sm" disabled={tankerForm.formState.isSubmitting}>
                  {tankerForm.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Place order
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowOrderForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tank gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tanks.map(tank => {
          const color = levelColor(tank.currentLevelPct);
          const data = [{ name: tank.name, value: tank.currentLevelPct, fill: color }];
          return (
            <Card key={tank._id}>
              <CardContent className="pt-5">
                <div className="flex flex-col items-center">
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="60%" outerRadius="90%" data={data} startAngle={220} endAngle={-40}>
                        <RadialBar dataKey="value" background={{ fill: "#f4f4f4" }} cornerRadius={6} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="-mt-12 text-center">
                    <p className="text-3xl font-bold" style={{ color }}>{tank.currentLevelPct}%</p>
                    <p className="text-xs text-muted-foreground">{formatKL(tank.capacityKL * tank.currentLevelPct / 100)} / {formatKL(tank.capacityKL)}</p>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-semibold">{tank.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tank.type.replace("_", " ")}</p>
                  </div>
                  {tank.currentLevelPct < 20 && (
                    <Badge variant="critical" className="mt-2">Critical — order now</Badge>
                  )}
                  {tank.currentLevelPct >= 20 && tank.currentLevelPct < 50 && (
                    <Badge variant="warning" className="mt-2">Low level</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {tanks.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
            No tanks configured. Add tanks in Settings.
          </div>
        )}
      </div>

      {/* Charts + prediction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 7-day consumption */}
        <Card>
          <CardHeader><CardTitle className="text-sm">7-day consumption (KL)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={consumptionByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} KL`, "Consumption"]} />
                {avgConsumption > 0 && <ReferenceLine y={avgConsumption} stroke="#BA7517" strokeDasharray="4 4" label={{ value: "avg", fontSize: 10, fill: "#BA7517" }} />}
                <Bar dataKey="value" fill="#185FA5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Source breakdown (7 days)</CardTitle></CardHeader>
          <CardContent>
            {sourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {sourceBreakdown.map((entry, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[entry.name] ?? "#cccccc"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} KL`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No readings yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prediction card */}
      {prediction && (
        <Card className="border-l-4" style={{ borderLeftColor: prediction.daysUntilCritical < 3 ? "#A32D2D" : prediction.daysUntilCritical < 7 ? "#BA7517" : "#3B6D11" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Shortage prediction
              <Badge variant="outline" className="text-xs ml-auto">rule_v1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Days until critical</p>
                <p className="text-2xl font-bold" style={{ color: prediction.daysUntilCritical < 3 ? "#A32D2D" : prediction.daysUntilCritical < 7 ? "#BA7517" : "#3B6D11" }}>
                  {prediction.daysUntilCritical}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Current stock</p>
                <p className="text-2xl font-bold">{prediction.totalCurrentKL} KL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Avg daily use</p>
                <p className="text-2xl font-bold">{prediction.avgDailyConsumption} KL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Order by</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {daysFromNow(prediction.recommendedOrderDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tanker order history */}
      {orders && orders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tanker order history</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-left pb-2 font-medium">Qty (KL)</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                  {orders.map(order => (
                    <tr key={order._id}>
                      <td className="py-2 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="py-2 font-medium">{order.quantityKL} KL</td>
                      <td className="py-2">
                        <Badge variant={STATUS_COLORS[order.status] as any}>{order.status}</Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">{order.cost ? `₹${order.cost}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
