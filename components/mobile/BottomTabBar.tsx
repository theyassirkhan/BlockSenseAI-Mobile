"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2X2, Bell, Plus, MoreHorizontal } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  isFAB?: boolean;
}

export function BottomTabBar() {
  const pathname = usePathname();

  const tabs: TabItem[] = [
    { href: "/dashboard", icon: <Home size={22} />, label: "Home" },
    { href: "/dashboard/utilities", icon: <Grid2X2 size={22} />, label: "Utilities" },
    { href: "/dashboard/alerts", icon: <Bell size={22} />, label: "Alerts", isFAB: false },
    { href: "/dashboard/more", icon: <MoreHorizontal size={22} />, label: "More" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around" style={{ height: 64 }}>
        {tabs.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={pathname === tab.href || pathname.startsWith(tab.href + "/")} />
        ))}

        {/* FAB center button */}
        <Link
          href="/dashboard/actions"
          className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg -mt-5 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}
          aria-label="Quick actions"
        >
          <Plus size={26} strokeWidth={2.5} />
        </Link>

        {tabs.slice(2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={pathname === tab.href || pathname.startsWith(tab.href + "/")} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: TabItem; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[44px] min-h-[44px] text-xs transition-colors",
        active ? "text-purple-400" : "text-muted-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {tab.icon}
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  );
}
