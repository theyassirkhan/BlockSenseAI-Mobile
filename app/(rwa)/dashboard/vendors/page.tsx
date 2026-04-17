"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus } from "lucide-react";
import { toast } from "sonner";

const VENDOR_TYPES = [
  "water_tanker", "diesel", "gas", "desludge", "waste_pickup",
  "garbage", "electrical", "plumbing", "other",
] as const;

type VendorType = typeof VENDOR_TYPES[number];

const TYPE_COLOR: Record<VendorType, string> = {
  water_tanker: "#185FA5",
  diesel: "#854F0B",
  gas: "#0F6E56",
  desludge: "#993C1D",
  waste_pickup: "#993556",
  garbage: "#3B6D11",
  electrical: "#5C3D82",
  plumbing: "#1C6A6A",
  other: "#6B7280",
};

export default function VendorsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const vendors = useQuery(api.vendors.getBySociety, societyId ? { societyId } : "skip");
  const addVendor = useMutation(api.vendors.add);
  const toggleActive = useMutation(api.vendors.setActive);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "other" as VendorType, phone: "", whatsapp: "", ratePerUnit: "", unit: "" });

  async function handleAdd() {
    if (!societyId || !form.name || !form.phone) return toast.error("Name and phone required");
    setSaving(true);
    try {
      await addVendor({
        societyId,
        name: form.name,
        type: form.type,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        ratePerUnit: form.ratePerUnit ? Number(form.ratePerUnit) : undefined,
        unit: form.unit || undefined,
      });
      toast.success("Vendor added");
      setForm({ name: "", type: "other", phone: "", whatsapp: "", ratePerUnit: "", unit: "" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Vendors
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add vendor
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">New Vendor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AquaPure Water Services" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label>Rate per unit</Label>
                <Input type="number" value={form.ratePerUnit} onChange={e => setForm({ ...form, ratePerUnit: e.target.value })} placeholder="150" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="KL / trip / month" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add vendor"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Vendor</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Rate</th>
                  <th className="text-left px-4 py-3 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(vendors ?? []).map(v => (
                  <tr key={v._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium capitalize" style={{ color: TYPE_COLOR[v.type as VendorType] ?? "#6B7280" }}>
                        {v.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {v.ratePerUnit ? `₹${v.ratePerUnit}/${v.unit ?? "unit"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.rating ? `${v.rating}/5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={(v.isActive ?? v.isPreferred) ? "default" : "secondary"} className="text-[10px]">
                        {(v.isActive ?? v.isPreferred) ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => toggleActive({ vendorId: v._id, isActive: !(v.isActive ?? v.isPreferred) })}
                      >
                        {(v.isActive ?? v.isPreferred) ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!(vendors ?? []).length && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No vendors yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
