"use client";

import { useState } from "react";
import { ResidentSidebar } from "@/components/resident/sidebar";
import { ResidentHeader } from "@/components/resident/header";

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ResidentSidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ResidentHeader onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
