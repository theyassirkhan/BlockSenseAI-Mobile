"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

const ROLE_COLOR: Record<string, string> = {
  platform_admin: "#0F6E56",
  admin: "#185FA5",
  rwa: "#854F0B",
  resident: "#6b7280",
  staff: "#993556",
};

export default function AdminUsersPage() {
  const societies = useQuery(api.societies_internal.listAll, {});
  const [selectedSociety, setSelectedSociety] = useState<string>("all");
  const [search, setSearch] = useState("");

  const users = useQuery(
    api.users.getBySociety,
    selectedSociety !== "all" ? { societyId: selectedSociety as any } : "skip"
  );

  const societyMap = new Map(societies?.map((s) => [s._id, s]) ?? []);

  const filtered = (users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9 w-52"
              placeholder="Search name / email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedSociety} onValueChange={setSelectedSociety}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All societies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All societies</SelectItem>
              {societies?.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {selectedSociety === "all" ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Select a society to view its users.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Flat</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-4 py-3 font-medium">{u.name ?? <span className="text-muted-foreground italic">Unnamed</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        {u.role ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${ROLE_COLOR[u.role] ?? "#6b7280"}18`,
                              color: ROLE_COLOR[u.role] ?? "#6b7280",
                            }}
                          >
                            {u.role}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.flatNumber ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.isActive === false ? "text-destructive" : "text-success"}`}>
                          {u.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.createdAt ? formatDateTime(u.createdAt) : "—"}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        {search ? "No users match your search." : "No users in this society."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
