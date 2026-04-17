"use client";

import Link from "next/link";
import { Droplets, Zap, Flame, FlaskConical, Trash2, Recycle } from "lucide-react";

const utilities = [
  { icon: <Droplets size={28} />, label: "Water", href: "/dashboard/water", color: "#185FA5", status: "Tank 42%" },
  { icon: <Zap size={28} />, label: "Power", href: "/dashboard/power", color: "#BA7517", status: "Normal" },
  { icon: <Flame size={28} />, label: "Gas", href: "/dashboard/gas", color: "#E05A2B", status: "Active" },
  { icon: <FlaskConical size={28} />, label: "Sewage", href: "/dashboard/sewage", color: "#6B5B2E", status: "Normal" },
  { icon: <Trash2 size={28} />, label: "Waste", href: "/dashboard/waste", color: "#4A7C59", status: "Collected" },
  { icon: <Recycle size={28} />, label: "Garbage", href: "/dashboard/garbage", color: "#5A6E3A", status: "Scheduled" },
];

export default function UtilitiesHubPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Utilities</h1>
      <div className="grid grid-cols-2 gap-3">
        {utilities.map((u) => (
          <Link
            key={u.label}
            href={u.href}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border active:scale-[0.97] transition-transform shadow-sm"
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl text-white"
              style={{ backgroundColor: u.color }}
            >
              {u.icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{u.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{u.status}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
