"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function TopAppBar({ title, showBack, leftContent, rightContent }: TopAppBarProps) {
  const router = useRouter();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border flex items-center px-4 gap-3"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {leftContent}
        {title && (
          <h1 className="text-base font-semibold truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {rightContent ?? (
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted active:bg-muted/80 transition-colors"
            aria-label="Profile"
          >
            <User size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
