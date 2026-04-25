"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  notice: "#A855F7",
  visitor: "#38BDF8",
  payment: "#34D399",
  invite: "#F59E0B",
  system: "#6B7280",
};

const TYPE_LABEL: Record<string, string> = {
  notice: "Notice",
  visitor: "Visitor",
  payment: "Payment",
  invite: "Invite",
  system: "System",
};

export function NotificationBell() {
  const unreadCount = useQuery(api.inAppNotifications.unreadCount);
  const notifications = useQuery(api.inAppNotifications.list, { limit: 20 });
  const markRead = useMutation(api.inAppNotifications.markRead);
  const markAllRead = useMutation(api.inAppNotifications.markAllRead);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={`${count} unread notifications`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
            style={{ background: "#EF4444", padding: "0 2px" }}
            aria-hidden
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-1 bg-card border rounded-xl shadow-2xl z-50 w-80 overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No notifications yet
              </div>
            ) : (
              <ul>
                {notifications.map(n => (
                  <li
                    key={n._id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b transition-colors cursor-pointer hover:bg-white/5",
                      !n.read && "bg-white/[0.03]"
                    )}
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    onClick={() => { if (!n.read) markRead({ notificationId: n._id }); }}
                  >
                    <div
                      className="mt-0.5 w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: n.read ? "rgba(255,255,255,0.15)" : TYPE_COLOR[n.type] ?? "#6B7280" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-semibold truncate", n.read ? "text-muted-foreground" : "text-foreground")}>
                          {n.title}
                        </p>
                        <span
                          className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${TYPE_COLOR[n.type] ?? "#6B7280"}20`, color: TYPE_COLOR[n.type] ?? "#6B7280" }}
                        >
                          {TYPE_LABEL[n.type] ?? n.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead({ notificationId: n._id }); }}
                        className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
