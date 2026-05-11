"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();

  // Only redirect once profile is confirmed loaded and has a non-admin role
  if (profile !== undefined && profile !== null &&
      profile.role !== "admin" && profile.role !== "platform_admin") {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminHeader onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
