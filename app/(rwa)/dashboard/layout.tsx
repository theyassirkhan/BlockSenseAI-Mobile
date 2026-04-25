"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { RwaSidebar } from "@/components/rwa/sidebar";
import { RwaHeader } from "@/components/rwa/header";
import { AnimatedPage } from "@/components/ui/animated-page";
import { AmbientBg } from "@/components/ui/ambient-bg";

export default function RwaDashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();

  useEffect(() => {
    if (profile === undefined) return;
    if (profile === null || !profile.onboardingComplete) { router.replace("/onboarding"); return; }
    if (profile.role === "admin" || profile.role === "platform_admin") { router.replace("/admin"); return; }
    if (profile.role === "resident" || profile.role === "staff") { router.replace("/resident"); return; }
    if (profile.role === "guard") { router.replace("/guard"); return; }
  }, [profile]);

  if (profile === undefined) return null;
  if (profile && profile.role !== "rwa" && profile.role !== "admin" && profile.role !== "platform_admin") return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background relative">
      <AmbientBg />
      <RwaSidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <RwaHeader societyId={profile?.societyId} onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}
