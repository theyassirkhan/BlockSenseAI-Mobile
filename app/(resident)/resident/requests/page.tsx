"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Star, Camera, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const CATEGORIES = ["plumbing", "electrical", "carpentry", "cleaning", "pest_control", "lift", "parking", "security", "other"];

const STATUS_COLOR: Record<string, "default" | "warning" | "secondary" | "critical"> = {
  open: "warning",
  in_progress: "default",
  resolved: "secondary",
  closed: "secondary",
};

export default function ResidentRequestsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const blockId = profile?.blockId;
  const myRequests = useQuery(api.serviceRequests.getMyRequests, societyId ? { societyId } : "skip");
  const createRequest = useMutation(api.serviceRequests.create);
  const rateRequest = useMutation(api.serviceRequests.rate);
  const generateUploadUrl = useMutation(api.serviceRequests.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "plumbing", description: "", priority: "medium" as "low" | "medium" | "urgent" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    if (!societyId || !blockId || !form.description) return toast.error("Description required — make sure your block is set in your profile");
    setSaving(true);
    try {
      let photoStorageId: Id<"_storage"> | undefined;

      if (photoFile) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photoFile.type },
          body: photoFile,
        });
        if (!res.ok) throw new Error("Photo upload failed");
        const { storageId } = await res.json();
        photoStorageId = storageId;
      }

      await createRequest({
        societyId,
        blockId: blockId as any,
        category: form.category,
        description: form.description,
        priority: form.priority,
        photoStorageId,
      });
      toast.success("Request submitted");
      setForm({ category: "plumbing", description: "", priority: "medium" });
      clearPhoto();
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRate(requestId: Id<"serviceRequests">, rating: number) {
    try {
      await rateRequest({ requestId, rating });
      toast.success("Rating submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          My Requests
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New request
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Submit Service Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" />
            </div>

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label>Photo evidence (optional)</Label>
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="Preview" className="rounded-lg w-32 h-32 object-cover border border-border" />
                  <button
                    onClick={clearPhoto}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border border-dashed border-border rounded-lg px-4 py-3 cursor-pointer text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                  <Camera className="h-4 w-4" />
                  <span>Take photo or upload</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Submitting…" : "Submit"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); clearPhoto(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(myRequests ?? []).map(r => (
          <Card key={r._id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm capitalize">{r.category.replace("_", " ")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {r.photoStorageId && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ImageIcon className="h-3 w-3" /> Photo attached
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={STATUS_COLOR[r.status] ?? "secondary"} className="text-[10px]">
                    {r.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">{r.priority}</Badge>
                </div>
              </div>
              {r.internalNotes && (
                <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
                  <span className="font-medium">Update: </span>{r.internalNotes}
                </div>
              )}
              {r.status === "resolved" && !r.residentRating && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rate resolution:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => handleRate(r._id, star)} className="text-muted-foreground hover:text-yellow-500 transition-colors">
                      <Star className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
              {r.residentRating && (
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: r.residentRating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Your rating</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!(myRequests ?? []).length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No requests yet. Submit one above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
