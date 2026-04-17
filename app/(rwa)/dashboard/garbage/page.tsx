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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Plus, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const scheduleSchema = z.object({
  vendorId: z.string().min(1),
  scheduledAt: z.string().min(1, "Date required"),
});
type ScheduleForm = z.infer<typeof scheduleSchema>;

const STATUS_STYLES: Record<string, { variant: string; icon: React.ReactNode }> = {
  collected: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { variant: "warning", icon: <Clock className="h-3 w-3" /> },
  missed: { variant: "critical", icon: <AlertTriangle className="h-3 w-3" /> },
  rescheduled: { variant: "info", icon: <Clock className="h-3 w-3" /> },
};

export default function GarbagePage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const schedule = useQuery(api.garbage.getSchedule, societyId && blockId ? { societyId, blockId } : "skip");
  const missed = useQuery(api.garbage.getMissed, societyId && blockId ? { societyId, blockId } : "skip");
  const vendors = useQuery(api.vendors.getBySociety, societyId ? { societyId, type: "garbage" } : "skip");

  const scheduleCollection = useMutation(api.garbage.scheduleCollection);
  const confirmCollection = useMutation(api.garbage.confirmCollection);

  const [showForm, setShowForm] = useState(false);
  const form = useForm<ScheduleForm>({ resolver: zodResolver(scheduleSchema) });

  async function onSubmit(data: ScheduleForm) {
    if (!societyId || !blockId) return;
    try {
      await scheduleCollection({
        societyId, blockId,
        vendorId: data.vendorId as any,
        scheduledAt: new Date(data.scheduledAt).getTime(),
      });
      toast.success("Collection scheduled");
      form.reset();
      setShowForm(false);
    } catch {
      toast.error("Failed to schedule");
    }
  }

  async function handleConfirm(logId: string) {
    try {
      await confirmCollection({ logId: logId as any });
      toast.success("Collection confirmed");
    } catch {
      toast.error("Failed to confirm");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Truck className="h-5 w-5" style={{ color: "#3B6D11" }} />
          Garbage Collection
        </h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(p => !p)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Schedule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Schedule collection</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label className="text-xs">Vendor</Label>
                <Select onValueChange={v => form.setValue("vendorId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>)}
                    {(!vendors || vendors.length === 0) && <SelectItem value="none" disabled>No garbage vendors</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date &amp; time</Label>
                <Input type="datetime-local" {...form.register("scheduledAt")} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Missed */}
      {missed && missed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-critical flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4" />
            {missed.length} missed collection{missed.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {missed.map(m => (
              <li key={m._id} className="text-xs text-muted-foreground">
                Scheduled {formatDateTime(m.scheduledAt)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Schedule timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Schedule (±2 weeks)</CardTitle></CardHeader>
        <CardContent>
          {!schedule || schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No collections scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {schedule.map(item => {
                const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
                const isPast = item.scheduledAt < Date.now();
                return (
                  <li key={item._id} className={cn("flex items-center justify-between rounded-lg border p-3", isPast && item.status === "pending" && "bg-red-50")}>
                    <div className="flex items-center gap-2">
                      <Badge variant={style.variant as any} className="flex items-center gap-1">
                        {style.icon}{item.status}
                      </Badge>
                      <span className="text-sm">{formatDateTime(item.scheduledAt)}</span>
                    </div>
                    {item.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirm(item._id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirm
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
