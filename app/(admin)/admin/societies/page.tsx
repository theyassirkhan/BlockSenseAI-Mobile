"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Pencil, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/utils";

const PLAN_COLOR: Record<string, string> = {
  basic: "#6b7280",
  pro: "#185FA5",
  enterprise: "#0F6E56",
};

export default function AdminSocietiesPage() {
  const societies = useQuery(api.societies_internal.listAll, {});
  const createSociety = useMutation(api.societies.create);
  const updateSociety = useMutation(api.societies.update);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", totalFlats: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<Id<"societies"> | null>(null);
  const [planChange, setPlanChange] = useState<Record<string, string>>({});

  async function handleCreate() {
    if (!form.name || !form.city) return toast.error("Name and city required");
    setSaving(true);
    try {
      await createSociety({
        name: form.name,
        city: form.city,
        address: form.address || undefined,
        totalFlats: form.totalFlats ? Number(form.totalFlats) : undefined,
      });
      toast.success("Society created");
      setForm({ name: "", city: "", address: "", totalFlats: "" });
      setShowCreate(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanChange(societyId: Id<"societies">, plan: string) {
    try {
      await updateSociety({
        societyId,
        // @ts-ignore
        subscriptionPlan: plan,
      });
      toast.success("Plan updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Society Management
        </h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Society
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-sm">New Society</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Society Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Green Valley Society" />
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bangalore" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Road" />
              </div>
              <div className="space-y-1.5">
                <Label>Total Flats</Label>
                <Input type="number" value={form.totalFlats} onChange={(e) => setForm({ ...form, totalFlats: e.target.value })} placeholder="120" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Societies table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Society</th>
                  <th className="text-left px-4 py-3 font-medium">City</th>
                  <th className="text-left px-4 py-3 font-medium">Flats</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {societies?.map((s) => (
                  <tr key={s._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.totalFlats ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={s.subscriptionPlan}
                        onValueChange={(v) => handlePlanChange(s._id, v)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs" style={{ color: PLAN_COLOR[s.subscriptionPlan] }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${s.isActive === false ? "text-destructive" : "text-success"}`}>
                        {s.isActive === false ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button className="p-1 rounded hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
                {societies?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">No societies yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
