"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ResidentSidebar } from "@/components/resident/sidebar";
import { ResidentHeader } from "@/components/resident/header";
import { ResidentBottomTabs } from "@/components/resident/bottom-tabs";
import { AiChat } from "@/components/ui/ai-chat";
import { AnimatedPage } from "@/components/ui/animated-page";
import { AmbientBg } from "@/components/ui/ambient-bg";
import type { Id } from "@/convex/_generated/dataModel";

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const society = useQuery(api.societies.get, profile?.societyId ? { societyId: profile.societyId as Id<"societies"> } : "skip");
  const router = useRouter();

  useEffect(() => {
    if (profile === undefined) return;
    if (profile === null || !profile.onboardingComplete) { router.replace("/onboarding"); return; }
    if (profile.role === "admin" || profile.role === "platform_admin") { router.replace("/admin"); return; }
    if (profile.role === "rwa") { router.replace("/dashboard"); return; }
    if (profile.role === "guard") { router.replace("/guard"); return; }
    if (profile.status === "pending") { router.replace("/resident/pending"); return; }
    if (profile.status === "rejected") { router.replace("/login?error=rejected"); return; }
  }, [profile]);

  if (profile === undefined) return null;
  if (profile && profile.role !== "resident" && profile.role !== "staff") return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background relative">
      <AmbientBg />
      <ResidentSidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <ResidentHeader onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-20 md:p-5 md:pb-5">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
      <ResidentBottomTabs onMore={() => setMobileOpen(true)} />
      {profile?.societyId && profile?.defaultBlockId && (
        <AiChat
          societyId={profile.societyId}
          blockId={profile.defaultBlockId}
          residentName={profile.name ?? "Resident"}
          flatNumber={profile.flatNumber ?? ""}
          societyName={society?.name ?? "Society"}
        />
      )}
    </div>
  );
}
