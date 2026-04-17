"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Droplets, CreditCard, ClipboardList,
  Bell, User, ChevronLeft,
} from "lucide-react";

const NAV = [
  { href: "/resident", label: "Home", icon: LayoutDashboard },
  { href: "/resident/utilities", label: "Utilities", icon: Droplets },
  { href: "/resident/payments", label: "Payments", icon: CreditCard },
  { href: "/resident/requests", label: "Requests", icon: ClipboardList },
  { href: "/resident/notices", label: "Notices", icon: Bell },
  { href: "/resident/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ResidentSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-card border-r transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-48"
      )}
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
    >
      <div className={cn("flex items-center gap-2.5 px-4 py-4 border-b", collapsed && "justify-center px-2")} style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">BS</span>
        </div>
        {!collapsed && <span className="font-bold text-sm tracking-tight text-foreground">BlockSense</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/resident" ? pathname === "/resident" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
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
