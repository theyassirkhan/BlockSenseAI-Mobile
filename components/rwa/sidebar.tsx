"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Droplets, Zap, Flame, Wind, Trash2, Truck, Users2,
  BellRing, BarChart3, Settings, LayoutDashboard, ChevronLeft,
  Building2, Wrench, CreditCard, Megaphone, TicketCheck, ClipboardList, X,
  MessageSquareWarning,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/residents", label: "Residents", icon: Building2 },
  { href: "/dashboard/staff", label: "Staff", icon: Users2 },
  { href: "/dashboard/vendors", label: "Vendors", icon: Wrench },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/service-requests", label: "Requests", icon: ClipboardList },
  { href: "/dashboard/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/dashboard/complaints", label: "Complaints", icon: MessageSquareWarning, iconClass: "text-orange-400" },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/water", label: "Water", icon: Droplets, iconClass: "text-blue-400" },
  { href: "/dashboard/power", label: "Power", icon: Zap, iconClass: "text-amber-400" },
  { href: "/dashboard/gas", label: "Gas", icon: Flame, iconClass: "text-orange-400" },
  { href: "/dashboard/sewage", label: "Sewage", icon: Wind, iconClass: "text-slate-400" },
  { href: "/dashboard/waste", label: "Waste", icon: Trash2, iconClass: "text-teal-400" },
  { href: "/dashboard/garbage", label: "Garbage", icon: Truck, iconClass: "text-purple-400" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function RwaSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "h-dvh flex flex-col sidebar-glass border-r border-white/[0.07] transition-all duration-300 shrink-0",
          "fixed inset-y-0 left-0 z-40 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-52"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.07]",
            collapsed && "md:justify-center md:px-2"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">BS</span>
          </div>
          <span className={cn("font-bold text-sm tracking-tight text-foreground flex-1", collapsed && "md:hidden")}>BlockSense</span>
          <button
            onClick={onMobileClose}
            className="ml-auto p-1 rounded-md hover:bg-white/10 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, iconClass }) => {
            const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
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
                <Icon className={cn("h-4 w-4 shrink-0", !isActive && iconClass)} />
                <span className={cn(collapsed && "md:hidden")}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/[0.07] hidden md:block">
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
    </>
  );
}
