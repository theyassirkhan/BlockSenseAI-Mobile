"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const invite = useQuery((api as any).invites.getByToken, { token });

  useEffect(() => {
    if (invite === undefined) return;
    if (invite === null) return;
    // Store invite token in sessionStorage so onboarding can pick it up
    sessionStorage.setItem("inviteToken", token);
    sessionStorage.setItem("inviteData", JSON.stringify({
      role: invite.role,
      societyId: invite.societyId,
      blockId: invite.blockId,
      flatNumber: invite.flatNumber,
      email: invite.email,
      societyName: invite.society?.name,
      blockName: invite.block?.name,
    }));
    router.replace("/login?invite=1");
  }, [invite]);

  if (invite === undefined) {
    return (
      <div className="min-h-dvh bg-[#0D0D0D] flex items-center justify-center gap-3 text-white">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        <span className="text-sm">Validating invite…</span>
      </div>
    );
  }

  if (invite === null) {
    return (
      <div className="min-h-dvh bg-[#0D0D0D] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Invite not found</h1>
          <p className="text-sm text-gray-400">This invite link is invalid, expired, or has already been used.</p>
          <button
            onClick={() => router.replace("/login")}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Go to login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0D0D0D] flex items-center justify-center gap-3 text-white">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
      <span className="text-sm">Redirecting to sign in…</span>
    </div>
  );
}
