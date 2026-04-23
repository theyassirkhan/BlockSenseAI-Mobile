"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function RootRedirect() {
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setup = searchParams.get("setup");

  useEffect(() => {
    // Demo login: forward immediately with the setup param — don't wait for profile
    if (setup) {
      if (setup === "admin") {
        router.replace(`/admin?setup=admin`);
      } else if (setup === "resident") {
        router.replace(`/resident?setup=resident`);
      } else {
        router.replace(`/dashboard?setup=${setup}`);
      }
      return;
    }

    // Normal login: wait for profile to load then route by role
    if (profile === undefined) return;
    if (profile === null) {
      router.replace("/login");
      return;
    }
    if (profile.role === "platform_admin" || profile.role === "admin") {
      router.replace("/admin");
    } else if (profile.role === "resident") {
      router.replace("/resident");
    } else {
      router.replace("/dashboard");
    }
  }, [profile, setup]);

  return null;
}

export default function RootPage() {
  return (
    <Suspense>
      <RootRedirect />
    </Suspense>
  );
}
