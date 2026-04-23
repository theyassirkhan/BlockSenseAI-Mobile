"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();

  useEffect(() => {
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
  }, [profile]);

  return null;
}
