"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Building2, Users2, Truck, Plus, Loader2 } from "lucide-react";

const societySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().min(1),
});

const vendorSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  phone: z.string().min(10),
  whatsapp: z.string().optional(),
  ratePerUnit: z.coerce.number().optional(),
  unit: z.string().optional(),
});

export default function SettingsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;

  const society = useQuery(api.societies.get, societyId ? { societyId } : "skip");
  const blocks = useQuery(api.societies.getBlocks, societyId ? { societyId } : "skip");
  const vendors = useQuery(api.vendors.getBySociety, societyId ? { societyId } : "skip");
  const users = useQuery(api.users.getBySociety, societyId ? { societyId } : "skip");

  const updateSociety = useMutation(api.societies.update);
  const addBlock = useMutation(api.societies.addBlock);
  const createVendor = useMutation(api.vendors.create);

  const societyForm = useForm<z.infer<typeof societySchema>>({ resolver: zodResolver(societySchema) });
  const vendorForm = useForm<z.infer<typeof vendorSchema>>({ resolver: zodResolver(vendorSchema) });

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blockType, setBlockType] = useState<"block" | "wing" | "villa" | "tower">("block");

  async function onSocietySubmit(data: z.infer<typeof societySchema>) {
    if (!societyId) return;
    try {
      await updateSociety({ societyId, ...data });
      toast.success("Society updated");
    } catch { toast.error("Failed to update"); }
  }

  async function handleAddBlock() {
    if (!societyId || !blockName) return;
    try {
      await addBlock({ societyId, name: blockName, type: blockType });
      toast.success("Block added");
      setBlockName("");
    } catch { toast.error("Failed to add block"); }
  }

  async function onVendorSubmit(data: z.infer<typeof vendorSchema>) {
    if (!societyId) return;
    try {
      await createVendor({ societyId, ...data, type: data.type as any, isPreferred: false });
      toast.success("Vendor added");
      vendorForm.reset();
      setShowVendorForm(false);
    } catch { toast.error("Failed to add vendor"); }
  }

  const VENDOR_TYPES = ["water_tanker","diesel","gas","desludge","waste_pickup","garbage","electrical","plumbing","other"];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Settings className="h-5 w-5" />Settings
      </h1>

      <Tabs defaultValue="society">
        <TabsList>
          <TabsTrigger value="society">Society</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Society */}
        <TabsContent value="society" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Society details</CardTitle></CardHeader>
            <CardContent>
              {society ? (
                <form onSubmit={societyForm.handleSubmit(onSocietySubmit)} className="space-y-3 max-w-md">
                  <div className="space-y-1">
                    <Label>Society name</Label>
                    <Input defaultValue={society.name} {...societyForm.register("name")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input defaultValue={society.address ?? ""} {...societyForm.register("address")} />
                  </div>
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input defaultValue={society.city} {...societyForm.register("city")} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Plan:</span>
                    <Badge variant="outline" className="capitalize">{society.subscriptionPlan}</Badge>
                  </div>
                  <Button type="submit" size="sm">Save changes</Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocks */}
        <TabsContent value="blocks" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Add block</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={blockName} onChange={e => setBlockName(e.target.value)} placeholder="Block C" className="w-32" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={blockType} onValueChange={v => setBlockType(v as any)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block">Block</SelectItem>
                      <SelectItem value="wing">Wing</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="tower">Tower</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddBlock}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>All blocks ({blocks?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {blocks?.map(b => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <span className="font-medium">{b.name}</span>
                  <Badge variant="outline" className="capitalize">{b.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors */}
        <TabsContent value="vendors" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowVendorForm(p => !p)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add vendor
            </Button>
          </div>
          {showVendorForm && (
            <Card>
              <CardHeader><CardTitle>Add vendor</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={vendorForm.handleSubmit(onVendorSubmit)} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input {...vendorForm.register("name")} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select onValueChange={v => vendorForm.setValue("type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label><Input {...vendorForm.register("phone")} /></div>
                  <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input {...vendorForm.register("whatsapp")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Rate / unit</Label><Input type="number" {...vendorForm.register("ratePerUnit")} /></div>
                  <div className="space-y-1"><Label className="text-xs">Unit</Label><Input placeholder="KL, litre..." {...vendorForm.register("unit")} /></div>
                  <div className="col-span-2 md:col-span-3 flex gap-2">
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowVendorForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Vendors ({vendors?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {vendors?.map(v => (
                <div key={v._id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <div>
                    <p className="font-medium">{v.name} {v.isPreferred && "⭐"}</p>
                    <p className="text-xs text-muted-foreground">{v.phone}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{v.type.replace("_", " ")}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users2 className="h-4 w-4" />Members ({users?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {users?.map(u => (
                <div key={u._id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.flatNumber ?? "—"}</p>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : u.role === "rwa" ? "info" : "secondary"} className="capitalize">{u.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
