"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Loader2, Trophy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";

const schema = z.object({
  dryWasteKG: z.coerce.number().min(0),
  wetWasteKG: z.coerce.number().min(0),
  segregationOk: z.boolean(),
});
type Form = z.infer<typeof schema>;

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
    date: format(new Date(l.loggedAt), "dd/MM"),
    dry: l.dryWasteKG,
    wet: l.wetWasteKG,
  })) ?? [];

  const totalDry = logs?.reduce((s, l) => s + l.dryWasteKG, 0) ?? 0;
  const totalWet = logs?.reduce((s, l) => s + l.wetWasteKG, 0) ?? 0;
  const compliance = logs && logs.length > 0 ? Math.round(logs.filter(l => l.segregationOk).length / logs.length * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Trash2 className="h-5 w-5" style={{ color: "#993556" }} />
          Solid Waste
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(p => !p)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Log waste
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Daily waste entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Dry waste (KG)</Label>
                <Input type="number" step="0.1" {...form.register("dryWasteKG")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Wet waste (KG)</Label>
                <Input type="number" step="0.1" {...form.register("wetWasteKG")} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Segregation OK?</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={segregation} onCheckedChange={v => { setSegregation(v); form.setValue("segregationOk", v); }} />
                  <span className="text-sm">{segregation ? "Yes" : "No"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Dry waste (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalDry.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">KG</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Wet waste (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalWet.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">KG</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase text-muted-foreground">Segregation compliance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: compliance >= 80 ? "#3B6D11" : compliance >= 50 ? "#BA7517" : "#A32D2D" }}>
              {compliance}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">14-day waste (KG)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="dry" stackId="a" fill="#993556" name="Dry" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wet" stackId="a" fill="#3B6D11" name="Wet" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-warning" />
              Block segregation leaderboard (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leaderboard.map((entry, i) => (
                <li key={entry.blockId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{entry.blockName}</span>
                  <span className="text-xs text-muted-foreground">{entry.totalKG} KG</span>
                  <Badge variant={entry.compliancePct >= 80 ? "success" : entry.compliancePct >= 50 ? "warning" : "critical"}>
                    {entry.compliancePct}%
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
