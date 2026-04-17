"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Society", "Blocks", "Tanks", "DG Units", "Vendors"] as const;

// Step 1
const societySchema = z.object({
  name: z.string().min(2, "Name required"),
  address: z.string().optional(),
  city: z.string().min(2, "City required"),
  totalFlats: z.coerce.number().positive().optional(),
});

type SocietyForm = z.infer<typeof societySchema>;

interface BlockEntry { name: string; type: "block" | "wing" | "villa" | "tower"; totalFlats?: number; id?: Id<"blocks"> }
interface TankEntry { name: string; type: "overhead" | "sump" | "borewell_sump"; capacityKL: number; blockId: Id<"blocks"> }
interface DGEntry { name: string; capacityKVA: number; dieselCapacityLiters: number; dieselLevelLiters: number; consumptionRateLPH: number; blockId: Id<"blocks"> }
interface VendorEntry { name: string; type: string; phone: string; whatsapp?: string; isPreferred: boolean }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [societyId, setSocietyId] = useState<Id<"societies"> | null>(null);
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [tanks, setTanks] = useState<TankEntry[]>([]);
  const [dgUnits, setDGUnits] = useState<DGEntry[]>([]);
  const [vendors, setVendors] = useState<VendorEntry[]>([]);

  const createSociety = useMutation(api.societies.create);
  const addBlock = useMutation(api.societies.addBlock);
  const addTank = useMutation(api.water.addTank);
  const addDGUnit = useMutation(api.power.addDGUnit);
  const createVendor = useMutation(api.vendors.create);
  const createProfile = useMutation(api.users.createProfile);
  const setActiveSociety = useMutation(api.users.setActiveSociety);

  const societyForm = useForm<SocietyForm>({ resolver: zodResolver(societySchema), defaultValues: { city: "Bangalore" } });

  // Step 1 — Society
  async function onSocietySubmit(data: SocietyForm) {
    setLoading(true);
    try {
      const id = await createSociety(data);
      setSocietyId(id);
      setStep(1);
    } catch {
      toast.error("Failed to create society");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — Blocks (save all)
  async function saveBlocks() {
    if (!societyId || blocks.length === 0) { toast.error("Add at least one block"); return; }
    setLoading(true);
    try {
      const withIds: BlockEntry[] = [];
      for (const b of blocks) {
        const id = await addBlock({ societyId, name: b.name, type: b.type, totalFlats: b.totalFlats });
        withIds.push({ ...b, id });
      }
      setBlocks(withIds);
      setStep(2);
    } catch {
      toast.error("Failed to save blocks");
    } finally {
      setLoading(false);
    }
  }

  // Step 3 — Tanks
  async function saveTanks() {
    if (!societyId) return;
    setLoading(true);
    try {
      for (const t of tanks) {
        await addTank({ societyId, blockId: t.blockId, name: t.name, type: t.type, capacityKL: t.capacityKL, currentLevelPct: 100 });
      }
      setStep(3);
    } catch {
      toast.error("Failed to save tanks");
    } finally {
      setLoading(false);
    }
  }

  // Step 4 — DG Units
  async function saveDGUnits() {
    if (!societyId) return;
    setLoading(true);
    try {
      for (const d of dgUnits) {
        await addDGUnit({ societyId, blockId: d.blockId, name: d.name, capacityKVA: d.capacityKVA, dieselCapacityLiters: d.dieselCapacityLiters, dieselLevelLiters: d.dieselLevelLiters, consumptionRateLPH: d.consumptionRateLPH });
      }
      setStep(4);
    } catch {
      toast.error("Failed to save DG units");
    } finally {
      setLoading(false);
    }
  }

  // Step 5 — Vendors + finish
  async function saveVendorsAndFinish() {
    if (!societyId) return;
    setLoading(true);
    try {
      for (const v of vendors) {
        await createVendor({ societyId, name: v.name, type: v.type as any, phone: v.phone, whatsapp: v.whatsapp, isPreferred: v.isPreferred });
      }
      await createProfile({ name: "Admin", role: "admin", societyId });
      await setActiveSociety({ societyId });
      toast.success("Society set up! Welcome to BlockSense.");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to finish setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <span className="text-white font-bold text-lg">BS</span>
          </div>
          <h1 className="text-xl font-bold">Set up your society</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 shrink-0">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors",
                i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white ring-2 ring-primary/20" : "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm" style={{ borderColor: "rgba(0,0,0,0.08)" }}>

          {/* Step 1: Society */}
          {step === 0 && (
            <form onSubmit={societyForm.handleSubmit(onSocietySubmit)} className="space-y-4">
              <h2 className="font-semibold text-base">Society details</h2>
              <div className="space-y-1.5">
                <Label>Society name *</Label>
                <Input placeholder="e.g. Prestige Lakeside Habitat" {...societyForm.register("name")} />
                {societyForm.formState.errors.name && <p className="text-xs text-destructive">{societyForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input placeholder="Street address" {...societyForm.register("address")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input {...societyForm.register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total flats</Label>
                  <Input type="number" placeholder="240" {...societyForm.register("totalFlats")} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>
          )}

          {/* Step 2: Blocks */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-base">Add blocks / wings</h2>
              <BlockBuilder blocks={blocks} onChange={setBlocks} />
              <Button className="w-full" onClick={saveBlocks} disabled={loading || blocks.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save &amp; continue
              </Button>
            </div>
          )}

          {/* Step 3: Tanks */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-base">Add water tanks</h2>
              <p className="text-xs text-muted-foreground">Add overhead tanks, sumps, or borewells for each block.</p>
              <TankBuilder blocks={blocks} tanks={tanks} onChange={setTanks} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Skip</Button>
                <Button className="flex-1" onClick={saveTanks} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save &amp; continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: DG Units */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-base">Add diesel generator units</h2>
              <DGBuilder blocks={blocks} dgUnits={dgUnits} onChange={setDGUnits} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>Skip</Button>
                <Button className="flex-1" onClick={saveDGUnits} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save &amp; continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Vendors */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-base">Add vendors</h2>
              <VendorBuilder vendors={vendors} onChange={setVendors} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={saveVendorsAndFinish} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Skip &amp; finish
                </Button>
                <Button className="flex-1" onClick={saveVendorsAndFinish} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save &amp; finish
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockBuilder({ blocks, onChange }: { blocks: BlockEntry[]; onChange: (b: BlockEntry[]) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BlockEntry["type"]>("block");
  const [totalFlats, setTotalFlats] = useState("");

  function add() {
    if (!name.trim()) return;
    onChange([...blocks, { name: name.trim(), type, totalFlats: totalFlats ? Number(totalFlats) : undefined }]);
    setName(""); setTotalFlats("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Block A" onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={v => setType(v as any)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Block</SelectItem>
              <SelectItem value="wing">Wing</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="tower">Tower</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Flats</Label>
          <Input className="w-16" type="number" value={totalFlats} onChange={e => setTotalFlats(e.target.value)} placeholder="60" />
        </div>
        <Button type="button" size="icon" onClick={add} className="mb-0"><Plus className="h-4 w-4" /></Button>
      </div>
      {blocks.length > 0 && (
        <ul className="space-y-1.5">
          {blocks.map((b, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{b.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{b.type}</Badge>
                {b.totalFlats && <span className="text-xs text-muted-foreground">{b.totalFlats} flats</span>}
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TankBuilder({ blocks, tanks, onChange }: { blocks: BlockEntry[]; tanks: TankEntry[]; onChange: (t: TankEntry[]) => void }) {
  const [name, setName] = useState("Overhead Tank 1");
  const [type, setType] = useState<TankEntry["type"]>("overhead");
  const [capacityKL, setCapacityKL] = useState("50");
  const [blockId, setBlockId] = useState<string>(blocks[0]?.id ?? "");

  function add() {
    if (!blockId || !name) return;
    onChange([...tanks, { name, type, capacityKL: Number(capacityKL), blockId: blockId as Id<"blocks"> }]);
    setName(`Tank ${tanks.length + 2}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Block</Label>
          <Select value={blockId} onValueChange={setBlockId}>
            <SelectTrigger><SelectValue placeholder="Select block" /></SelectTrigger>
            <SelectContent>
              {blocks.map(b => b.id && <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={v => setType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="overhead">Overhead</SelectItem>
              <SelectItem value="sump">Sump</SelectItem>
              <SelectItem value="borewell_sump">Borewell Sump</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Capacity (KL)</Label>
          <Input type="number" value={capacityKL} onChange={e => setCapacityKL(e.target.value)} />
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full gap-2"><Plus className="h-3.5 w-3.5" />Add tank</Button>
      {tanks.length > 0 && (
        <ul className="space-y-1">
          {tanks.map((t, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>{t.name} — {t.capacityKL} KL</span>
              <button onClick={() => onChange(tanks.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DGBuilder({ blocks, dgUnits, onChange }: { blocks: BlockEntry[]; dgUnits: DGEntry[]; onChange: (d: DGEntry[]) => void }) {
  const [name, setName] = useState("DG Unit 1");
  const [capacityKVA, setCapacityKVA] = useState("62.5");
  const [dieselCap, setDieselCap] = useState("250");
  const [dieselLevel, setDieselLevel] = useState("200");
  const [rate, setRate] = useState("3.5");
  const [blockId, setBlockId] = useState<string>(blocks[0]?.id ?? "");

  function add() {
    if (!blockId) return;
    onChange([...dgUnits, { name, capacityKVA: Number(capacityKVA), dieselCapacityLiters: Number(dieselCap), dieselLevelLiters: Number(dieselLevel), consumptionRateLPH: Number(rate), blockId: blockId as Id<"blocks"> }]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Block</Label>
          <Select value={blockId} onValueChange={setBlockId}>
            <SelectTrigger><SelectValue placeholder="Select block" /></SelectTrigger>
            <SelectContent>
              {blocks.map(b => b.id && <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Capacity (kVA)</Label><Input type="number" value={capacityKVA} onChange={e => setCapacityKVA(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Tank capacity (L)</Label><Input type="number" value={dieselCap} onChange={e => setDieselCap(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Current level (L)</Label><Input type="number" value={dieselLevel} onChange={e => setDieselLevel(e.target.value)} /></div>
        <div className="space-y-1 col-span-2"><Label className="text-xs">Consumption rate (L/hr)</Label><Input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} /></div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full gap-2"><Plus className="h-3.5 w-3.5" />Add DG unit</Button>
      {dgUnits.length > 0 && (
        <ul className="space-y-1">
          {dgUnits.map((d, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>{d.name} — {d.capacityKVA} kVA</span>
              <button onClick={() => onChange(dgUnits.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VendorBuilder({ vendors, onChange }: { vendors: VendorEntry[]; onChange: (v: VendorEntry[]) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("water_tanker");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const VENDOR_TYPES = [
    { value: "water_tanker", label: "Water Tanker" },
    { value: "diesel", label: "Diesel" },
    { value: "gas", label: "Gas" },
    { value: "desludge", label: "Desludge" },
    { value: "garbage", label: "Garbage" },
    { value: "electrical", label: "Electrical" },
    { value: "plumbing", label: "Plumbing" },
    { value: "other", label: "Other" },
  ];

  function add() {
    if (!name || !phone) { toast.error("Name and phone required"); return; }
    onChange([...vendors, { name, type, phone, whatsapp: whatsapp || undefined, isPreferred: true }]);
    setName(""); setPhone(""); setWhatsapp("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ravi Water Tankers" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" /></div>
        <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Same as phone" /></div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full gap-2"><Plus className="h-3.5 w-3.5" />Add vendor</Button>
      {vendors.length > 0 && (
        <ul className="space-y-1">
          {vendors.map((v, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>{v.name} — {v.phone}</span>
              <button onClick={() => onChange(vendors.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
