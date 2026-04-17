"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Droplets, Zap, Flame, Wind, Trash2, Truck, Users2,
  BellRing, BarChart3, Settings, LayoutDashboard, ChevronLeft
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/water", label: "Water", icon: Droplets, color: "#185FA5" },
  { href: "/power", label: "Power", icon: Zap, color: "#854F0B" },
  { href: "/gas", label: "Gas", icon: Flame, color: "#0F6E56" },
  { href: "/sewage", label: "Sewage", icon: Wind, color: "#993C1D" },
  { href: "/waste", label: "Waste", icon: Trash2, color: "#993556" },
  { href: "/garbage", label: "Garbage", icon: Truck, color: "#3B6D11" },
  { href: "/staff", label: "Staff", icon: Users2 },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-card border-r transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-52"
      )}
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 py-4 border-b", collapsed && "justify-center px-2")} style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">BS</span>
        </div>
        {!collapsed && <span className="font-bold text-sm tracking-tight text-foreground">BlockSense</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "sidebar-item",
                isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" style={isActive ? undefined : color ? { color } : undefined} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-item sidebar-item-inactive w-full justify-center"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
