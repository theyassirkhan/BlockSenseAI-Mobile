"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Suspense } from "react";

function GuardLayoutInner({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (profile === undefined) return;
    if (searchParams.get("setup") === "guard") return;
    if (profile === null || !profile.onboardingComplete) { router.replace("/onboarding"); return; }
    if (profile.role === "admin" || profile.role === "platform_admin") { router.replace("/admin"); return; }
    if (profile.role === "rwa") { router.replace("/dashboard"); return; }
    if (profile.role === "resident" || profile.role === "staff") { router.replace("/resident"); return; }
  }, [profile, searchParams]);

  if (profile === undefined) return null;
  if (profile && profile.role !== "guard" && !searchParams.get("setup")) return null;

  return <>{children}</>;
}

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <GuardLayoutInner>{children}</GuardLayoutInner>
    </Suspense>
  );
}
