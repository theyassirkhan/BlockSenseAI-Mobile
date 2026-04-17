"use client";

import { useState, useEffect } from "react";
import { X, Share } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 86400 * 1000) return;
    }

    if (isIOS()) {
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const install = async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] bg-background border-t border-border shadow-xl rounded-t-2xl p-4 pb-safe animate-in slide-in-from-bottom duration-300"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      role="dialog"
      aria-label="Install BlockSense"
    >
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full active:bg-muted"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          BS
        </div>
        <div>
          <p className="font-semibold text-sm">Install BlockSense</p>
          <p className="text-xs text-muted-foreground">Add to home screen</p>
        </div>
      </div>

      {showIOSInstructions ? (
        <div className="text-sm text-muted-foreground bg-muted rounded-xl p-3 flex items-start gap-2">
          <Share size={18} className="flex-shrink-0 mt-0.5" />
          <p>Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong>.</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={install}
            className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-semibold text-sm active:scale-95 transition-transform min-h-[44px]"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-medium active:bg-muted transition-colors min-h-[44px]"
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
