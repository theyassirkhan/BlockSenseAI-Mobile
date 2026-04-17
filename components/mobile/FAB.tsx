"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Droplets, Zap, Truck, AlertTriangle, BellRing } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

const quickActions = [
  { icon: <Droplets size={22} />, label: "Log Water Reading", href: "/dashboard/water?action=log" },
  { icon: <Zap size={22} />, label: "Log Power Reading", href: "/dashboard/power?action=log" },
  { icon: <Truck size={22} />, label: "Order Tanker", href: "/dashboard/water?action=tanker" },
  { icon: <AlertTriangle size={22} />, label: "Log Outage", href: "/dashboard/power?action=outage" },
  { icon: <BellRing size={22} />, label: "Raise Alert", href: "/dashboard/alerts?action=new" },
];

export function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAction = (href: string) => {
    setOpen(false);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#0F6E56] text-white shadow-xl active:scale-95 transition-transform"
        aria-label="Quick actions"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 1rem)" }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Quick Actions">
        <div className="flex flex-col gap-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.href)}
              className="flex items-center gap-4 w-full px-2 py-4 rounded-xl active:bg-muted transition-colors text-left min-h-[56px]"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-foreground flex-shrink-0">
                {action.icon}
              </span>
              <span className="text-base font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
