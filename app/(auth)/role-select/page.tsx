"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Building2, Home, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function RoleSelectPage() {
  const router = useRouter();
  const [role, setRole] = useState<"rwa" | "resident" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [selectedSociety, setSelectedSociety] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [loading, setLoading] = useState(false);

  const createProfile = useMutation(api.users.createProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const societies = useQuery(api.societies.listAll);
  const blocks = useQuery(
    api.societies.getBlocks,
    selectedSociety ? { societyId: selectedSociety as Id<"societies"> } : "skip"
  );

  async function handleSubmit() {
    if (!role || !name.trim()) {
      toast.error("Name and role required");
      return;
    }

    setLoading(true);
    try {
      if (role === "rwa") {
        // RWA: create profile, then go to society onboarding
        await createProfile({ name: name.trim(), role, phone: phone || undefined });
        router.push("/onboarding");
      } else {
        // Resident: need society + block + flat
        if (!selectedSociety) {
          toast.error("Select your society");
          setLoading(false);
          return;
        }
        await createProfile({
          name: name.trim(),
          role,
          societyId: selectedSociety as Id<"societies">,
          blockId: selectedBlock ? (selectedBlock as Id<"blocks">) : undefined,
          flatNumber: flatNumber || undefined,
          phone: phone || undefined,
        });
        // Mark resident onboarding complete immediately
        await completeOnboarding({
          whatsapp: phone || "",
          whatsappVerified: false,
          societyId: selectedSociety as Id<"societies">,
          blockId: selectedBlock ? (selectedBlock as Id<"blocks">) : undefined,
        });
        router.push("/resident");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <span className="text-white font-bold text-xl">BS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to BlockSense</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your profile to get started</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm space-y-5" style={{ borderColor: "#27272A" }}>
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Your name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              type="tel"
            />
          </div>

          {/* Role picker */}
          <div className="space-y-2">
            <Label>I am a… *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setRole("rwa"); setSelectedSociety(""); setSelectedBlock(""); }}
                className={cn(
                  "flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all duration-200",
                  role === "rwa"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <Building2 className="h-7 w-7" />
                <div className="text-center">
                  <p className="text-sm font-semibold">RWA Manager</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set up & manage society</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("resident")}
                className={cn(
                  "flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all duration-200",
                  role === "resident"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <Home className="h-7 w-7" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Resident</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Join existing society</p>
                </div>
              </button>
            </div>
          </div>

          {/* Resident-specific fields */}
          {role === "resident" && (
            <div className="space-y-4 pt-1 border-t border-dashed animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <p className="text-xs font-medium text-muted-foreground pt-3 uppercase tracking-wide">
                Society details
              </p>

              {/* Society selector */}
              <div className="space-y-1.5">
                <Label>Select your society *</Label>
                <Select value={selectedSociety} onValueChange={(v) => { setSelectedSociety(v); setSelectedBlock(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose society" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies?.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name} — {s.city}
                      </SelectItem>
                    ))}
                    {(!societies || societies.length === 0) && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No societies registered yet. Ask your RWA manager to set up.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Block selector */}
              {selectedSociety && blocks && blocks.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Block / Wing</Label>
                  <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose block" />
                    </SelectTrigger>
                    <SelectContent>
                      {blocks.map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Flat number */}
              <div className="space-y-1.5">
                <Label>Flat number</Label>
                <Input
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. A-204"
                />
              </div>
            </div>
          )}

          {/* RWA info note */}
          {role === "rwa" && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                Next: Set up your society, blocks & infrastructure
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !role || !name.trim() || (role === "resident" && !selectedSociety)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {role === "rwa" ? "Continue to society setup" : role === "resident" ? "Join society" : "Continue"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Your data stays private within your community.
        </p>
      </div>
    </div>
  );
}
