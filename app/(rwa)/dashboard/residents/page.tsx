"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Upload, X, CheckCircle2, AlertCircle, UserPlus, Copy, Link2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import Papa from "papaparse";

interface CsvRow { name: string; flatNumber: string; phone?: string; email?: string; flatType?: string; }

export default function ResidentsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const residents = useQuery(api.users.getBySociety, societyId ? { societyId } : "skip");
  const bulkImport = useMutation(api.users.bulkImportResidents);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const blocks = useQuery(api.societies.getBlocks, societyId ? { societyId } : "skip");
  const blockMap = new Map(blocks?.map(b => [b._id, b.name]) ?? []);

  const createInvite = useMutation((api as any).invites.create);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ role: "resident" as const, blockId: "", flatNumber: "", email: "" });
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const filtered = (residents ?? []).filter(r => {
    if (filterRole !== "all" && r.role !== filterRole) return false;
    if (filterBlock !== "all" && r.blockId !== filterBlock) return false;
    const q = search.toLowerCase();
    if (q && !r.name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q) && !r.flatNumber?.toLowerCase().includes(q)) return false;
    return true;
  });

  const ROLE_BADGE: Record<string, "default" | "secondary" | "warning"> = {
    admin: "warning", rwa: "default", resident: "secondary", staff: "secondary",
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows: CsvRow[] = data
          .map(row => ({
            name: (row["name"] || row["Name"] || "").trim(),
            flatNumber: (row["flatNumber"] || row["flat_number"] || row["Flat"] || row["flat"] || "").trim(),
            phone: (row["phone"] || row["Phone"] || "").trim() || undefined,
            email: (row["email"] || row["Email"] || "").trim() || undefined,
            flatType: (row["flatType"] || row["flat_type"] || row["FlatType"] || "").trim() || undefined,
          }))
          .filter(r => r.name && r.flatNumber);
        setPreview(rows);
        setImportResult(null);
      },
    });
    e.target.value = "";
  }

  async function handleCreateInvite() {
    if (!societyId) return;
    setInviting(true);
    try {
      const { token } = await createInvite({
        societyId: societyId as any,
        blockId: inviteForm.blockId ? inviteForm.blockId as any : undefined,
        flatNumber: inviteForm.flatNumber || undefined,
        role: inviteForm.role,
        email: inviteForm.email || undefined,
      });
      setCreatedToken(token);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleImport() {
    if (!societyId || !blockId || preview.length === 0) return;
    setImporting(true);
    try {
      const result = await bulkImport({ societyId: societyId as any, blockId: blockId as any, rows: preview });
      setImportResult(result);
      setPreview([]);
      toast.success(`Imported ${result.inserted} residents (${result.skipped} updated/skipped)`);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Residents
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / flat…" className="pl-8 h-9 w-48" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="resident">Resident</SelectItem>
              <SelectItem value="rwa">RWA</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBlock} onValueChange={setFilterBlock}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All blocks</SelectItem>
              {blocks?.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => { setShowInvite(p => !p); setCreatedToken(null); }} className="h-9 border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowImport(p => !p); setPreview([]); setImportResult(null); }} className="h-9 border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> CSV Import
          </Button>
        </div>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-400" />
                Create Invitation Link
              </CardTitle>
              <button onClick={() => { setShowInvite(false); setCreatedToken(null); }}>
                <X className="h-4 w-4 text-muted-foreground hover:text-white" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!createdToken ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Role</label>
                    <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v as any }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resident">Resident</SelectItem>
                        <SelectItem value="guard">Guard</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Block (optional)</label>
                    <Select value={inviteForm.blockId} onValueChange={v => setInviteForm(p => ({ ...p, blockId: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Any block" /></SelectTrigger>
                      <SelectContent>
                        {blocks?.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Flat number (optional)</label>
                    <Input
                      value={inviteForm.flatNumber}
                      onChange={e => setInviteForm(p => ({ ...p, flatNumber: e.target.value }))}
                      placeholder="A-204"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Email (optional)</label>
                    <Input
                      value={inviteForm.email}
                      onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="resident@email.com"
                      className="h-9"
                      type="email"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateInvite} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  {inviting ? "Creating…" : "Generate invite link"}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-green-300">Invite link created — valid for 7 days</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
                    {typeof window !== "undefined" ? `${window.location.origin}/join/${createdToken}` : `/join/${createdToken}`}
                  </span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/join/${createdToken}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Copied to clipboard");
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Share this link with the resident. They will be guided through onboarding with their details pre-filled.</p>
                <Button size="sm" variant="outline" onClick={() => { setCreatedToken(null); setInviteForm({ role: "resident", blockId: "", flatNumber: "", email: "" }); }}>
                  Create another
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Import panel */}
      {showImport && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-400" />
                Bulk Resident Import
              </CardTitle>
              <button onClick={() => { setShowImport(false); setPreview([]); setImportResult(null); }}>
                <X className="h-4 w-4 text-muted-foreground hover:text-white" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="font-semibold text-white mb-1.5">Required CSV columns:</p>
              <p className="text-muted-foreground font-mono">name, flatNumber</p>
              <p className="text-muted-foreground">Optional: phone, email, flatType</p>
              <p className="text-muted-foreground mt-1">Example: <span className="font-mono">Raju Kumar,A-204,9876543210,raju@email.com,2BHK</span></p>
            </div>

            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="border-white/10">
                Choose CSV file
              </Button>
              {preview.length > 0 && (
                <span className="text-sm text-muted-foreground">{preview.length} rows ready to import</span>
              )}
            </div>

            {preview.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        {["Name", "Flat", "Phone", "Email", "Type"].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2 font-mono">{r.flatNumber}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.flatType ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">…and {preview.length - 5} more rows</p>
                  )}
                </div>
                <Button onClick={handleImport} disabled={importing} className="bg-purple-600 hover:bg-purple-500 text-white">
                  {importing ? "Importing…" : `Import ${preview.length} residents`}
                </Button>
              </>
            )}

            {importResult && (
              <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-green-300">{importResult.inserted} new residents added, {importResult.skipped} updated/skipped.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Flat</th>
                  <th className="text-left px-4 py-3 font-medium">Block</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                          {r.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium">{r.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.email ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.flatNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.blockId ? (blockMap.get(r.blockId as any) ?? r.blockId.slice(0, 8)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE[r.role ?? "resident"] ?? "secondary"} className="text-[10px] capitalize">
                        {r.role ?? "resident"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r._creationTime ? formatDateTime(r._creationTime) : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No residents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
