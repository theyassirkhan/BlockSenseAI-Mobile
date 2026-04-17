"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveBlock } from "@/hooks/use-active-block";
import { BellRing, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  societyId?: Id<"societies">;
}

export function RwaHeader({ societyId }: HeaderProps) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);
  const society = useQuery(api.societies.get, societyId ? { societyId } : "skip");
  const blocks = useQuery(api.societies.getBlocks, societyId ? { societyId } : "skip");
  const { blockId, setBlockId } = useActiveBlock(profile?.defaultBlockId);

  const activeBlock = blocks?.find(b => b._id === blockId);
  const alerts = useQuery(
    api.alerts.getActiveAlerts,
    societyId && blockId ? { societyId, blockId } : "skip"
  );

  const [blockOpen, setBlockOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) setBlockOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const criticalCount = alerts?.filter(a => a.severity === "critical").length ?? 0;

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b bg-card shrink-0" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">{society?.name ?? "BlockSense"}</span>
        {society?.city && <span className="text-xs text-muted-foreground hidden sm:inline">{society.city}</span>}
      </div>

      <div className="flex items-center gap-2">
        {/* Block switcher */}
        {blocks && blocks.length > 0 && (
          <div className="relative" ref={blockRef}>
            <button
              onClick={() => setBlockOpen(p => !p)}
              aria-expanded={blockOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
              style={{ borderColor: "rgba(0,0,0,0.12)" }}
            >
              <span className="max-w-[120px] truncate">{activeBlock?.name ?? "Select block"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", blockOpen && "rotate-180")} />
            </button>
            {blockOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
                style={{ borderColor: "rgba(0,0,0,0.1)" }}
              >
                {blocks.map(b => (
                  <button
                    key={b._id}
                    role="option"
                    aria-selected={b._id === blockId}
                    onClick={() => { setBlockId(b._id); setBlockOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent",
                      b._id === blockId && "text-primary font-medium"
                    )}
                  >
                    {b.name}
                  </button>
                ))}
                <div className="border-t my-1" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
                <button
                  onClick={() => { router.push("/dashboard/block-select"); setBlockOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
                >
                  All blocks →
                </button>
              </div>
            )}
          </div>
        )}

        <ThemeToggle />

        {/* Alert bell */}
        <button
          onClick={() => router.push("/dashboard/alerts")}
          aria-label={`${criticalCount} critical alerts`}
          className="relative p-2 rounded-md hover:bg-accent transition-colors"
        >
          <BellRing className="h-4 w-4" />
          {criticalCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-critical rounded-full animate-pulse" aria-hidden />
          )}
        </button>

        {/* User menu */}
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
              style={{ borderColor: "rgba(0,0,0,0.1)" }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => { router.push("/dashboard/settings"); setUserOpen(false); }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />Settings
              </button>
              <button
                role="menuitem"
                onClick={async () => { await signOut(); router.push("/login"); }}
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
