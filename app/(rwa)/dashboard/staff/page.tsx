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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Plus, Loader2, Phone, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";

const staffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().optional(),
  shift: z.enum(["morning", "afternoon", "night", "full_day"]),
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueAt: z.string().optional(),
});

type StaffForm = z.infer<typeof staffSchema>;
type TaskForm = z.infer<typeof taskSchema>;

const SHIFT_LABELS = { morning: "Morning", afternoon: "Afternoon", night: "Night", full_day: "Full day" };
const SHIFT_COLORS: Record<string, string> = {
  morning: "#F59E0B",
  afternoon: "#38BDF8",
  night: "#A855F7",
  full_day: "#34D399",
};
const PRIORITY_COLORS = { low: "secondary", medium: "info", high: "warning", urgent: "critical" };
const STATUS_COLS = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StaffPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const staff = useQuery(api.staff.getStaffDirectory, societyId ? { societyId } : "skip");
  const tasks = useQuery(api.staff.getTasks, societyId ? { societyId } : "skip");

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const shifts = useQuery(api.shifts.getWeek, societyId ? { societyId, weekStart: weekStart.getTime() } : "skip");

  const addStaff = useMutation(api.staff.addStaff);
  const markAttendance = useMutation(api.staff.markAttendance);
  const createTask = useMutation(api.staff.createTask);
  const updateStatus = useMutation(api.staff.updateTaskStatus);
  const createShift = useMutation(api.shifts.create);
  const markShiftAttendance = useMutation(api.shifts.markAttendance);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    shiftType: "morning" as "morning" | "afternoon" | "night",
    startTime: "07:00",
    endTime: "15:00",
  });
  const [savingShift, setSavingShift] = useState(false);

  const staffForm = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: { shift: "morning" } });
  const taskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema), defaultValues: { priority: "medium" } });

  async function onStaffSubmit(data: StaffForm) {
    if (!societyId) return;
    try {
      await addStaff({ ...data, societyId });
      toast.success("Staff member added");
      staffForm.reset();
      setShowStaffForm(false);
    } catch { toast.error("Failed to add staff"); }
  }

  async function onTaskSubmit(data: TaskForm) {
    if (!societyId) return;
    try {
      await createTask({ ...data, societyId, blockId: blockId ?? undefined, dueAt: data.dueAt ? new Date(data.dueAt).getTime() : undefined });
      toast.success("Task created");
      taskForm.reset();
      setShowTaskForm(false);
    } catch { toast.error("Failed to create task"); }
  }

  async function handleToggleAttendance(staffId: string, current: boolean) {
    try {
      await markAttendance({ staffId: staffId as any, isOnDuty: !current });
      toast.success(!current ? "Marked on duty" : "Marked off duty");
    } catch { toast.error("Failed to update attendance"); }
  }

  async function handleStatusChange(taskId: string, status: "open" | "in_progress" | "done") {
    try {
      await updateStatus({ taskId: taskId as any, status });
    } catch { toast.error("Failed"); }
  }

  async function handleCreateShift() {
    if (!societyId || !shiftForm.staffId) { toast.error("Select a staff member"); return; }
    setSavingShift(true);
    try {
      await createShift({
        societyId: societyId as any,
        staffId: shiftForm.staffId as any,
        blockId: blockId as any ?? undefined,
        date: new Date(shiftForm.date).getTime(),
        shiftType: shiftForm.shiftType,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
      });
      toast.success("Shift scheduled");
      setShowShiftForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingShift(false);
    }
  }

  async function handleShiftStatus(shiftId: string, status: "present" | "absent" | "half_day" | "leave") {
    try {
      await markShiftAttendance({ shiftId: shiftId as any, status });
      toast.success(`Marked ${status.replace("_", " ")}`);
    } catch { toast.error("Failed"); }
  }

  const staffMap = new Map((staff ?? []).map(s => [s._id, s as any]));
  const onDutyCount = staff?.filter(s => s.isOnDuty).length ?? 0;

  // Build week grid: for each day column, collect shifts on that day
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const shiftsByDay: Record<string, any[]> = {};
  weekDays.forEach(d => { shiftsByDay[format(d, "yyyy-MM-dd")] = []; });
  (shifts ?? []).forEach(s => {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    if (shiftsByDay[key]) shiftsByDay[key].push(s);
  });



  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Staff &amp; Tasks
          {staff && <Badge variant="outline">{onDutyCount}/{staff.length} on duty</Badge>}
        </h1>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Directory</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* ── Staff directory ── */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowStaffForm(p => !p)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add staff
            </Button>
          </div>

          {showStaffForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Add staff member</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input {...staffForm.register("name")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Role</Label><Input placeholder="Security, Housekeeping..." {...staffForm.register("role")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label><Input {...staffForm.register("phone")} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default shift</Label>
                    <Select defaultValue="morning" onValueChange={v => staffForm.setValue("shift", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SHIFT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-4 flex gap-2">
                    <Button type="submit" size="sm" disabled={staffForm.formState.isSubmitting}>
                      {staffForm.formState.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowStaffForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              {!staff || staff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No staff added yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <th className="text-left pb-2 font-medium">Name</th>
                      <th className="text-left pb-2 font-medium">Role</th>
                      <th className="text-left pb-2 font-medium hidden sm:table-cell">Shift</th>
                      <th className="text-left pb-2 font-medium hidden md:table-cell">Phone</th>
                      <th className="text-left pb-2 font-medium">On duty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                    {staff.map(s => (
                      <tr key={s._id}>
                        <td className="py-2.5 font-medium">{s.name}</td>
                        <td className="py-2.5 text-muted-foreground">{s.role}</td>
                        <td className="py-2.5 hidden sm:table-cell">
                          <Badge variant="outline" className="capitalize text-xs">{SHIFT_LABELS[s.shift as keyof typeof SHIFT_LABELS]}</Badge>
                        </td>
                        <td className="py-2.5 hidden md:table-cell text-muted-foreground">
                          {s.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span> : "—"}
                        </td>
                        <td className="py-2.5">
                          <Switch checked={s.isOnDuty} onCheckedChange={() => handleToggleAttendance(s._id, s.isOnDuty)} aria-label={`Toggle ${s.name} duty status`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shifts ── */}
        <TabsContent value="shifts" className="mt-4 space-y-4">
          {/* Week navigator */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-xs text-muted-foreground hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
                  Today
                </button>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowShiftForm(p => !p)} className="border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Schedule shift
            </Button>
          </div>

          {showShiftForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold">Schedule a shift</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Staff member *</Label>
                      <Select value={shiftForm.staffId} onValueChange={v => setShiftForm(p => ({ ...p, staffId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>
                          {(staff ?? []).map(s => <SelectItem key={s._id} value={s._id}>{s.name} — {s.role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input type="date" value={shiftForm.date} onChange={e => setShiftForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Shift type</Label>
                      <Select value={shiftForm.shiftType} onValueChange={v => setShiftForm(p => ({ ...p, shiftType: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (7am–3pm)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (3pm–11pm)</SelectItem>
                          <SelectItem value="night">Night (11pm–7am)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Start time</Label>
                      <Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm(p => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">End time</Label>
                      <Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm(p => ({ ...p, endTime: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateShift} disabled={savingShift} className="bg-blue-600 hover:bg-blue-500">
                      {savingShift ? "Saving…" : "Schedule Shift"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowShiftForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Weekly grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day, di) => {
              const key = format(day, "yyyy-MM-dd");
              const isToday = format(new Date(), "yyyy-MM-dd") === key;
              const dayShifts = shiftsByDay[key] ?? [];
              return (
                <div key={key} className="min-h-[120px] rounded-xl p-2 space-y-1.5" style={{
                  background: isToday ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isToday ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{DAYS[di]}</p>
                    <p className={`text-sm font-bold ${isToday ? "text-purple-300" : "text-white"}`}>{format(day, "d")}</p>
                  </div>
                  {dayShifts.map(s => {
                    const member = staffMap.get(s.staffId);
                    const color = SHIFT_COLORS[s.shiftType] ?? "#A855F7";
                    return (
                      <div key={s._id} className="rounded-lg p-1.5 space-y-1" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                        <p className="text-[10px] font-medium leading-tight truncate" style={{ color }}>{(member as any)?.name ?? "—"}</p>
                        <p className="text-[9px] text-muted-foreground">{s.startTime}–{s.endTime}</p>
                        <Select
                          value={s.status}
                          onValueChange={v => handleShiftStatus(s._id, v as any)}
                        >
                          <SelectTrigger className="h-5 text-[9px] px-1.5 border-0 bg-black/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="half_day">Half day</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {(shifts ?? []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No shifts scheduled for this week.</p>
          )}
        </TabsContent>

        {/* ── Tasks ── */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowTaskForm(p => !p)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Create task
            </Button>
          </div>

          {showTaskForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Create task</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Title</Label><Input {...taskForm.register("title")} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select defaultValue="medium" onValueChange={v => taskForm.setValue("priority", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Due date</Label><Input type="date" {...taskForm.register("dueAt")} /></div>
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Description</Label><Input placeholder="Optional" {...taskForm.register("description")} /></div>
                  <div className="col-span-2 md:col-span-4 flex gap-2">
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUS_COLS.map(col => {
              const colTasks = tasks?.filter(t => t.status === col.status) ?? [];
              return (
                <div key={col.status}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <Badge variant="outline">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map(task => (
                      <Card key={task._id} className="cursor-default">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{task.title}</p>
                              {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                            </div>
                            <Badge variant={PRIORITY_COLORS[task.priority] as any} className="shrink-0 text-xs">{task.priority}</Badge>
                          </div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {col.status !== "open" && (
                              <button onClick={() => handleStatusChange(task._id, "open")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Open</button>
                            )}
                            {col.status !== "in_progress" && (
                              <button onClick={() => handleStatusChange(task._id, "in_progress")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">In progress</button>
                            )}
                            {col.status !== "done" && (
                              <button onClick={() => handleStatusChange(task._id, "done")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Done →</button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
