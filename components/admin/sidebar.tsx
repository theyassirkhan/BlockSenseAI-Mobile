"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Activity,
  Megaphone, TicketCheck, BarChart3, Settings, ChevronLeft, X,
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

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "h-screen flex flex-col sidebar-glass border-r transition-all duration-300 shrink-0",
          "fixed inset-y-0 left-0 z-50 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-52"
        )}
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div
          className={cn("flex items-center gap-2.5 px-4 py-4 border-b", collapsed && "md:justify-center md:px-2")}
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">BS</span>
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <span className="font-bold text-sm tracking-tight text-foreground block">BlockSense</span>
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Platform Admin</span>
          </div>
          <button
            onClick={onMobileClose}
            className="ml-auto p-1 rounded-md hover:bg-white/10 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  "sidebar-item",
                  isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                  collapsed && "md:justify-center md:px-2"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(collapsed && "md:hidden")}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t hidden md:block" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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
    </>
  );
}
