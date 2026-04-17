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
import { Users2, Plus, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

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
const PRIORITY_COLORS = { low: "secondary", medium: "info", high: "warning", urgent: "critical" };
const STATUS_COLS = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
] as const;

export default function StaffPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const staff = useQuery(api.staff.getStaffDirectory, societyId ? { societyId } : "skip");
  const tasks = useQuery(api.staff.getTasks, societyId ? { societyId } : "skip");

  const addStaff = useMutation(api.staff.addStaff);
  const markAttendance = useMutation(api.staff.markAttendance);
  const createTask = useMutation(api.staff.createTask);
  const updateStatus = useMutation(api.staff.updateTaskStatus);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
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
      toast.success("Status updated");
    } catch { toast.error("Failed"); }
  }

  const onDutyCount = staff?.filter(s => s.isOnDuty).length ?? 0;

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
          <TabsTrigger value="staff">Staff directory</TabsTrigger>
          <TabsTrigger value="tasks">Task board</TabsTrigger>
        </TabsList>

        {/* Staff */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowStaffForm(p => !p)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add staff
            </Button>
          </div>

          {showStaffForm && (
            <Card>
              <CardHeader><CardTitle>Add staff member</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input {...staffForm.register("name")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Role</Label><Input placeholder="Security, Housekeeping..." {...staffForm.register("role")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label><Input {...staffForm.register("phone")} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shift</Label>
                    <Select defaultValue="morning" onValueChange={v => staffForm.setValue("shift", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="full_day">Full day</SelectItem>
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
                    <tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
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
                          <Badge variant="outline" className="capitalize text-xs">{SHIFT_LABELS[s.shift]}</Badge>
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

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowTaskForm(p => !p)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Create task
            </Button>
          </div>

          {showTaskForm && (
            <Card>
              <CardHeader><CardTitle>Create task</CardTitle></CardHeader>
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

          {/* Kanban */}
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
                      <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
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
