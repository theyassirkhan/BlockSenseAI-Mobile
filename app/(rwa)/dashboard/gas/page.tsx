"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Loader2, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { format } from "date-fns";

const schema = z.object({
  meterReading: z.coerce.number().min(0),
  pressurePSI: z.coerce.number().min(0),
});

type Form = z.infer<typeof schema>;

export default function GasPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const latest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const readings = useQuery(api.gas.getReadings, societyId && blockId ? { societyId, blockId, months: 3 } : "skip");
  const addReading = useMutation(api.gas.addReading);

  const [showForm, setShowForm] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    if (!societyId || !blockId) return;
    try {
      await addReading({ ...data, societyId, blockId });
      toast.success("Gas reading logged");
      form.reset();
      setShowForm(false);
    } catch {
      toast.error("Failed to log reading");
    }
  }

  const chartData = readings?.slice().reverse().map(r => ({
    date: format(new Date(r.recordedAt), "dd MMM"),
    consumption: r.consumptionSCM ?? 0,
    pressure: r.pressurePSI,
  })) ?? [];

  if (!readings) return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Flame className="h-5 w-5" style={{ color: "#0F6E56" }} />
          Gas Management
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(p => !p)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Log reading
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Log gas reading</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Meter reading (SCM)</Label>
                <Input type="number" step="0.01" {...form.register("meterReading")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pressure (PSI)</Label>
                <Input type="number" step="0.1" {...form.register("pressurePSI")} />
              </div>
              <div className="space-y-1 flex items-end gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting} className="flex-1">
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Current pressure</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: (latest?.pressurePSI ?? 0) < 5 ? "#A32D2D" : "#0F6E56" }}>
              {latest?.pressurePSI ?? "—"} <span className="text-base font-normal">PSI</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{latest ? formatDateTime(latest.recordedAt) : "No readings"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Meter reading</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest?.meterReading ?? "—"} <span className="text-base font-normal">SCM</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Last consumption</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{latest?.consumptionSCM?.toFixed(2) ?? "—"} <span className="text-base font-normal">SCM</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Gas consumption trend (3 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="consumption" stroke="#0F6E56" strokeWidth={2} dot={false} name="Consumption (SCM)" />
              <Line type="monotone" dataKey="pressure" stroke="#BA7517" strokeWidth={2} dot={false} name="Pressure (PSI)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
