"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { LogOut, Settings, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useRef, useEffect } from "react";

interface ResidentHeaderProps { onMenuOpen?: () => void; }

export function ResidentHeader({ onMenuOpen }: ResidentHeaderProps) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);
  const society = useQuery(
    api.societies.get,
    profile?.societyId ? { societyId: profile.societyId } : "skip"
  );

  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-4 shrink-0 header-glass sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenuOpen} className="p-1.5 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors md:hidden shrink-0" aria-label="Open menu">
          <Menu className="h-5 w-5 text-white/70" />
        </button>
        <span className="text-sm font-semibold text-foreground truncate">{society?.name ?? "BlockSense"}</span>
        {profile?.flatNumber && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Flat {profile.flatNumber}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
      <ThemeToggle />
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserOpen(p => !p)}
          aria-expanded={userOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            {profile?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-sm font-medium hidden sm:inline max-w-[100px] truncate">{profile?.name ?? "..."}</span>
        </button>
        {userOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "resident"}</p>
            </div>
            <button
              role="menuitem"
              onClick={() => { router.push("/resident/profile"); setUserOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />Profile
            </button>
            <button
              role="menuitem"
              onClick={async () => { await signOut(); window.location.href = "/login"; }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />Sign out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
