"use client";

import Link from "next/link";
import { Users, UserCheck, Store, CreditCard, Megaphone, Wrench, FileBarChart, Settings, User, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  { icon: <Users size={20} />, label: "Staff", href: "/dashboard/staff" },
  { icon: <UserCheck size={20} />, label: "Residents", href: "/dashboard/residents" },
  { icon: <Store size={20} />, label: "Vendors", href: "/dashboard/vendors" },
  { icon: <CreditCard size={20} />, label: "Payments", href: "/dashboard/payments" },
  { icon: <Megaphone size={20} />, label: "Broadcasts", href: "/dashboard/broadcasts" },
  { icon: <Wrench size={20} />, label: "Service Requests", href: "/dashboard/service-requests" },
  { icon: <FileBarChart size={20} />, label: "Reports", href: "/dashboard/reports" },
  { icon: <Settings size={20} />, label: "Settings", href: "/dashboard/settings" },
  { icon: <User size={20} />, label: "Profile", href: "/dashboard/profile" },
];

export default function MorePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">More</h1>
      <div className="flex flex-col gap-1 rounded-2xl bg-card border border-border overflow-hidden">
        {menuItems.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-4 py-4 active:bg-muted transition-colors min-h-[56px] border-b border-border last:border-0"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground flex-shrink-0">
              {item.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ))}

        <button
          className="flex items-center gap-3 px-4 py-4 active:bg-destructive/10 transition-colors min-h-[56px] text-destructive w-full text-left"
          onClick={() => {/* handle logout */}}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 flex-shrink-0">
            <LogOut size={20} />
          </span>
          <span className="flex-1 text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
