"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RwaSidebar } from "@/components/rwa/sidebar";
import { RwaHeader } from "@/components/rwa/header";

export default function RwaDashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const profile = useQuery(api.users.getMyProfile);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <RwaSidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <RwaHeader societyId={profile?.societyId} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
