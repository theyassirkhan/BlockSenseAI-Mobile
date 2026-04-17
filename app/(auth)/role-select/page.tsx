"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Building2, Home } from "lucide-react";
import { toast } from "sonner";

export default function RoleSelectPage() {
  const router = useRouter();
  const [role, setRole] = useState<"rwa" | "resident" | null>(null);
  const [name, setName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const createProfile = useMutation(api.users.createProfile);

  async function handleSubmit() {
    if (!role || !name.trim()) { toast.error("Name and role required"); return; }
    setLoading(true);
    try {
      await createProfile({ name: name.trim(), role, flatNumber: flatNumber || undefined });
      router.push(role === "rwa" ? "/block-select" : "/resident");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <span className="text-white font-bold text-lg">BS</span>
          </div>
          <h1 className="text-xl font-bold">Welcome to BlockSense</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell us who you are</p>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm space-y-5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <div className="space-y-1.5">
            <Label>Your name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
          </div>

          <div className="space-y-2">
            <Label>I am a...</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("rwa")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  role === "rwa"
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                <Building2 className="h-6 w-6" />
                <div className="text-center">
                  <p className="text-sm font-semibold">RWA Member</p>
                  <p className="text-xs text-muted-foreground">Committee / Admin</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("resident")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  role === "resident"
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                <Home className="h-6 w-6" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Resident</p>
                  <p className="text-xs text-muted-foreground">Read-only view</p>
                </div>
              </button>
            </div>
          </div>

          {role === "resident" && (
            <div className="space-y-1.5">
              <Label>Flat number</Label>
              <Input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} placeholder="e.g. A-204" />
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading || !role || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
