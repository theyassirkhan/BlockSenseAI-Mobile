"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Zap, CreditCard, MessageSquare, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/resident", label: "Home", icon: House },
  { href: "/resident/utilities", label: "Utilities", icon: Zap },
  { href: "/resident/payments", label: "Payments", icon: CreditCard },
  { href: "/resident/complaints", label: "Complaints", icon: MessageSquare },
] as const;

interface ResidentBottomTabsProps {
  onMore: () => void;
}

export function ResidentBottomTabs({ onMore }: ResidentBottomTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-white/[0.08]"
      style={{ background: "rgba(5,5,8,0.92)", backdropFilter: "blur(20px)" }}
      aria-label="Main navigation"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/resident" ? pathname === "/resident" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[56px]"
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-teal-400" : "text-white/40")} />
            <span className={cn("text-[10px] transition-colors", isActive ? "text-teal-400" : "text-white/40")}>
              {label}
            </span>
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[56px]"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-white/40" />
        <span className="text-[10px] text-white/40">More</span>
      </button>
    </nav>
  );
}
