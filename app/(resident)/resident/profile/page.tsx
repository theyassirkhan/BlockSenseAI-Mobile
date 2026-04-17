"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save } from "lucide-react";
import { toast } from "sonner";

export default function ResidentProfilePage() {
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ name: string; phone: string; whatsapp: string } | null>(null);

  const editing = form ?? {
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
  };

  async function handleSave() {
    if (!editing.name) return toast.error("Name required");
    setSaving(true);
    try {
      await updateProfile({
        name: editing.name,
        phone: editing.phone || undefined,
        whatsapp: editing.whatsapp || undefined,
      });
      toast.success("Profile updated");
      setForm(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <User className="h-5 w-5" />
        My Profile
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Account details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={editing.name} onChange={e => setForm({ ...editing, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={editing.phone} onChange={e => setForm({ ...editing, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp (for notifications)</Label>
            <Input value={editing.whatsapp} onChange={e => setForm({ ...editing, whatsapp: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Society info</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Flat</dt>
              <dd className="font-medium">{profile?.flatNumber ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Flat type</dt>
              <dd className="font-medium capitalize">{profile?.flatType ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium capitalize">{profile?.role ?? "resident"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
