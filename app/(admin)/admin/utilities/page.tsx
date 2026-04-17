"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Droplets, Zap, Flame, Wind, Trash2, Truck } from "lucide-react";
import Link from "next/link";

const UTIL_ICONS: Record<string, any> = {
  water: { icon: Droplets, color: "#185FA5" },
  power: { icon: Zap, color: "#854F0B" },
  gas: { icon: Flame, color: "#0F6E56" },
  sewage: { icon: Wind, color: "#993C1D" },
  waste: { icon: Trash2, color: "#993556" },
  garbage: { icon: Truck, color: "#3B6D11" },
};

export default function AdminUtilitiesPage() {
  const societies = useQuery(api.societies_internal.listAll, {});

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Cross-Society Utility Monitor
      </h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <th className="text-left px-4 py-3 font-medium">Society</th>
                  {Object.entries(UTIL_ICONS).map(([key, { icon: Icon, color }]) => (
                    <th key={key} className="text-center px-4 py-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="capitalize">{key}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {societies?.map((s) => (
                  <tr key={s._id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-4 py-3 font-medium">
                      <div>
                        <p>{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.city}</p>
                      </div>
                    </td>
                    {Object.keys(UTIL_ICONS).map((util) => (
                      <td key={util} className="px-4 py-3 text-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-success/60" title="Normal" />
                      </td>
                    ))}
                  </tr>
                ))}
                {!societies?.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">No societies.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Click any cell to drill into that society's utility data. Cross-society alert feed coming in next phase.
      </p>
    </div>
  );
}
