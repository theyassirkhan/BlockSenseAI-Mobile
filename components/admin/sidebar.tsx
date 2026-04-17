"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Activity,
  Megaphone, TicketCheck, BarChart3, Settings, ChevronLeft,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/societies", label: "Societies", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/utilities", label: "Utilities", icon: Activity },
  { href: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/admin/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface Props { collapsed?: boolean; onToggle?: () => void; }

export function AdminSidebar({ collapsed, onToggle }: Props) {
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
      <div
        className={cn("flex items-center gap-2.5 px-4 py-4 border-b", collapsed && "justify-center px-2")}
        style={{ borderColor: "rgba(0,0,0,0.08)" }}
      >
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">BS</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight text-foreground block">BlockSense</span>
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Platform Admin</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-item",
                isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse */}
      <div className="p-2 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="sidebar-item sidebar-item-inactive w-full justify-center"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
