"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Bike, Plus, Trash2, ParkingCircle } from "lucide-react";
import { motion } from "framer-motion";

const TYPE_ICON = {
  car: Car,
  bike: Bike,
  other: Car,
};

const TYPE_COLOR = {
  car: "#38BDF8",
  bike: "#34D399",
  other: "#A855F7",
};

export default function VehiclesPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const vehicles = useQuery(api.vehicles.getMyVehicles, societyId ? { societyId } : "skip");
  const addVehicle = useMutation(api.vehicles.add);
  const removeVehicle = useMutation(api.vehicles.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: "", type: "car" as "car" | "bike" | "other", parkingSlot: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!societyId || !form.vehicleNumber) {
      toast.error("Vehicle number is required");
      return;
    }
    setSaving(true);
    try {
      await addVehicle({
        societyId: societyId as any,
        vehicleNumber: form.vehicleNumber.toUpperCase(),
        type: form.type,
        parkingSlot: form.parkingSlot || undefined,
      });
      toast.success("Vehicle registered");
      setForm({ vehicleNumber: "", type: "car", parkingSlot: "" });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(vehicleId: any) {
    try {
      await removeVehicle({ vehicleId });
      toast.success("Vehicle removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Car className="h-5 w-5 text-sky-400" />
          My Vehicles
        </h1>
        <Button size="sm" onClick={() => setShowForm(p => !p)} className="bg-sky-600 hover:bg-sky-500">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Vehicle
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Register a vehicle</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Vehicle number *</Label>
                  <Input
                    placeholder="KA01AB1234"
                    value={form.vehicleNumber}
                    onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parking slot</Label>
                  <Input
                    placeholder="B-12 (optional)"
                    value={form.parkingSlot}
                    onChange={e => setForm(p => ({ ...p, parkingSlot: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="flex gap-2">
                  {(["car", "bike", "other"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(p => ({ ...p, type: t }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
                      style={{
                        background: form.type === t ? `${TYPE_COLOR[t]}20` : "rgba(255,255,255,0.04)",
                        borderColor: form.type === t ? TYPE_COLOR[t] : "rgba(255,255,255,0.1)",
                        color: form.type === t ? TYPE_COLOR[t] : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {t === "car" ? <Car className="h-3.5 w-3.5" /> : t === "bike" ? <Bike className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={saving} className="bg-sky-600 hover:bg-sky-500">
                  {saving ? "Saving…" : "Register Vehicle"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(vehicles ?? []).map((v, i) => {
          const Icon = TYPE_ICON[v.type as keyof typeof TYPE_ICON] ?? Car;
          const color = TYPE_COLOR[v.type as keyof typeof TYPE_COLOR] ?? "#A855F7";
          return (
            <motion.div key={v._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold font-mono text-white tracking-wider">{v.vehicleNumber}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{v.type}</p>
                    {v.parkingSlot && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ParkingCircle className="h-3 w-3" />
                        Slot {v.parkingSlot}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(v._id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    aria-label="Remove vehicle"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(vehicles ?? []).length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground">
          <Car className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No vehicles registered yet.</p>
        </div>
      )}
    </div>
  );
}
