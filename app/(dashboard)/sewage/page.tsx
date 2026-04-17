"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wind, Plus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDateTime, levelColor } from "@/lib/utils";

const schema = z.object({
  stpStatus: z.enum(["normal", "maintenance", "fault", "offline"]),
  sludgeTankPct: z.coerce.number().min(0).max(100),
  treatedTankPct: z.coerce.number().min(0).max(100),
  inflowRateLPH: z.coerce.number().optional(),
});
type Form = z.infer<typeof schema>;

const STP_COLORS: Record<string, string> = {
  normal: "success",
  maintenance: "warning",
  fault: "critical",
  offline: "secondary",
};

export default function SewagePage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const latest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const addReading = useMutation(api.sewage.addReading);
  const [showForm, setShowForm] = useState(false);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { stpStatus: "normal" } });

  async function onSubmit(data: Form) {
    if (!societyId || !blockId) return;
    try {
      await addReading({ ...data, societyId, blockId });
      toast.success("Sewage reading logged");
      form.reset();
      setShowForm(false);
    } catch {
      toast.error("Failed to log reading");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Wind className="h-5 w-5" style={{ color: "#993C1D" }} />
          Sewage / STP
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(p => !p)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Log reading
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Log STP reading</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label className="text-xs">STP status</Label>
                <Select defaultValue="normal" onValueChange={v => form.setValue("stpStatus", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="fault">Fault</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sludge tank (%)</Label>
                <Input type="number" min="0" max="100" {...form.register("sludgeTankPct")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Treated tank (%)</Label>
                <Input type="number" min="0" max="100" {...form.register("treatedTankPct")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inflow (L/hr)</Label>
                <Input type="number" {...form.register("inflowRateLPH")} />
              </div>
              <div className="col-span-2 md:col-span-4 flex gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Status card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">STP Status</CardTitle></CardHeader>
          <CardContent>
            {latest ? (
              <div>
                <Badge variant={STP_COLORS[latest.stpStatus] as any} className="mb-2 flex items-center gap-1 w-fit">
                  {latest.stpStatus === "normal" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {latest.stpStatus}
                </Badge>
                <p className="text-xs text-muted-foreground">{formatDateTime(latest.recordedAt)}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No readings</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Sludge tank</CardTitle></CardHeader>
          <CardContent>
            {latest ? (
              <>
                <p className="text-3xl font-bold mb-2" style={{ color: levelColor(100 - latest.sludgeTankPct) }}>
                  {latest.sludgeTankPct}%
                </p>
                <Progress value={latest.sludgeTankPct} indicatorColor={latest.sludgeTankPct > 80 ? "#A32D2D" : latest.sludgeTankPct > 60 ? "#BA7517" : "#3B6D11"} />
                {latest.sludgeTankPct > 80 && <p className="text-xs text-destructive mt-1">Schedule desludging</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Treated water tank</CardTitle></CardHeader>
          <CardContent>
            {latest ? (
              <>
                <p className="text-3xl font-bold mb-2" style={{ color: levelColor(latest.treatedTankPct) }}>
                  {latest.treatedTankPct}%
                </p>
                <Progress value={latest.treatedTankPct} indicatorColor={levelColor(latest.treatedTankPct)} />
              </>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
