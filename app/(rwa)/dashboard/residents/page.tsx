"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function ResidentsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const residents = useQuery(
    api.users.getBySociety,
    societyId ? { societyId } : "skip"
  );

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");

  const blocks = useQuery(api.societies.getBlocks, societyId ? { societyId } : "skip");
  const blockMap = new Map(blocks?.map(b => [b._id, b.name]) ?? []);

  const filtered = (residents ?? []).filter(r => {
    if (filterRole !== "all" && r.role !== filterRole) return false;
    if (filterBlock !== "all" && r.blockId !== filterBlock) return false;
    const q = search.toLowerCase();
    if (q && !r.name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q) && !r.flatNumber?.toLowerCase().includes(q)) return false;
    return true;
  });

  const ROLE_BADGE: Record<string, "default" | "secondary" | "warning"> = {
    admin: "warning",
    rwa: "default",
    resident: "secondary",
    staff: "secondary",
  };

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
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name / flat…"
              className="pl-8 h-9 w-48"
            />
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
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
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
