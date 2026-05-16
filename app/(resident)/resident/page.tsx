"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  Droplets, Zap, Flame, CreditCard,
  ClipboardList, CheckCircle2, AlertTriangle, Bell,
  UserPlus, Waves,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function StatCard({
  href,
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  href: string;
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] h-full hover:bg-white/[0.05] transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <p className="font-mono text-2xl text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-white/40 truncate">{sub}</p>}
      </div>
    </Link>
  );
}

function StatusBanner({
  href,
  accentClass,
  borderClass,
  icon: Icon,
  iconClass,
  message,
  cta,
}: {
  href: string;
  accentClass: string;
  borderClass: string;
  icon: React.ElementType;
  iconClass: string;
  message: string;
  cta: string;
}) {
  return (
    <Link href={href} className="block">
      <div className={`flex items-center justify-between p-3.5 rounded-xl border-l-2 ${accentClass} ${borderClass} hover:opacity-90 transition-opacity cursor-pointer`}>
        <div className="flex items-center gap-2.5">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          <span className="text-sm font-medium text-white/80">{message}</span>
        </div>
        <span className={`text-xs font-medium ${iconClass} shrink-0`}>{cta} →</span>
      </div>
    </Link>
  );
}

function ResidentHomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const seedAllDemoData = useMutation(api.demo.seedAllDemoData);
  const setupDone = useRef(false);

  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    const setup = searchParams.get("setup") as "admin" | "rwa" | "resident" | null;
    if (!setup || setupDone.current) return;
    setupDone.current = true;
    setupDemoUser({ role: setup })
      .then(() => seedAllDemoData({}))
      .catch(() => {})
      .finally(() => router.replace("/resident"));
  }, [searchParams]);

  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const society = useQuery(api.societies.get, societyId ? { societyId } : "skip");
  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const gasLatest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const dues = useQuery(api.payments.getMyDues, societyId ? { societyId } : "skip");
  const myRequests = useQuery(api.serviceRequests.getMyRequests, societyId ? { societyId } : "skip");
  const alerts = useQuery(api.alerts.getActiveAlerts, societyId && blockId ? { societyId, blockId } : "skip");
  const notices = useQuery(api.notices.getBySociety, societyId ? { societyId } : "skip");
  const visitors = useQuery(api.visitors.getMyVisitors, societyId ? { societyId } : "skip");

  const isLoading = profile === undefined;

  const pendingDues = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
  const openRequests = (myRequests ?? []).filter(r => r.status === "open" || r.status === "in_progress");
  const criticalAlerts = (alerts ?? []).filter(a => a.severity === "critical");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name?.split(" ")[0] ?? "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-48 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Row 1 — Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-medium text-white">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-white/40 mt-0.5">
          {profile?.flatNumber ? `${profile.flatNumber}` : ""}
          {profile?.flatNumber && society?.name ? " · " : ""}
          {society?.name ?? ""}
        </p>
      </motion.div>

      {/* Row 2 — Status banners */}
      {(pendingDues.length > 0 || openRequests.length > 0) && (
        <motion.div variants={item} className="space-y-2">
          {pendingDues.length > 0 && (
            <StatusBanner
              href="/resident/payments"
              accentClass="bg-amber-400/[0.06]"
              borderClass="border-l-amber-400/60"
              icon={CreditCard}
              iconClass="text-amber-400"
              message={`${pendingDues.length} payment${pendingDues.length > 1 ? "s" : ""} pending`}
              cta="Pay now"
            />
          )}
          {openRequests.length > 0 && (
            <StatusBanner
              href="/resident/requests"
              accentClass="bg-sky-400/[0.06]"
              borderClass="border-l-sky-400/60"
              icon={ClipboardList}
              iconClass="text-sky-400"
              message={`${openRequests.length} request${openRequests.length > 1 ? "s" : ""} in progress`}
              cta="Track"
            />
          )}
        </motion.div>
      )}

      {/* Row 3 — Stat cards */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            href="/resident/payments"
            icon={CreditCard}
            iconClass={pendingDues.length > 0 ? "text-amber-400" : "text-white/30"}
            label="My dues"
            value={pendingDues.length > 0 ? pendingDues.length : "Clear"}
            sub={pendingDues.length > 0 ? `${pendingDues.length} pending` : "No outstanding dues"}
          />
          <StatCard
            href="/resident/utilities"
            icon={Droplets}
            iconClass="text-blue-400"
            label="Water"
            value={tanks && tanks.length > 0 ? `${tanks[0].currentLevelPct}%` : "—"}
            sub={tanks && tanks.length > 0 ? "Tank level" : "No data"}
          />
          <StatCard
            href="/resident/utilities"
            icon={Zap}
            iconClass="text-amber-400"
            label="Power"
            value={dgPred && dgPred.length > 0 ? `${dgPred[0].levelPct}%` : "—"}
            sub={dgPred && dgPred.length > 0 ? `${dgPred[0].hoursRemaining}h remaining` : "No data"}
          />
          <StatCard
            href="/resident/requests"
            icon={ClipboardList}
            iconClass={openRequests.length > 0 ? "text-sky-400" : "text-white/30"}
            label="Requests"
            value={openRequests.length}
            sub={openRequests.length === 0 ? "All resolved" : "Open requests"}
          />
        </div>
      </motion.div>

      {/* Row 4 — Notices + Visitors */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recent notices */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-white/50" />
              <span className="text-sm font-medium text-white">Recent notices</span>
            </div>
            <Link href="/resident/notices" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {!notices || notices.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-white/40">
              <Bell className="h-4 w-4 text-white/20 shrink-0" />
              No notices yet
            </div>
          ) : (
            <ul className="space-y-2">
              {notices.slice(0, 3).map((n) => (
                <li key={n._id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-medium bg-white/10 text-white/60`}>
                    {n.type ?? "notice"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{n.title}</p>
                    <p className="text-xs text-white/40 font-mono">{formatDateTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming visitors */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-white/50" />
              <span className="text-sm font-medium text-white">Upcoming visitors</span>
            </div>
            <Link href="/resident/visitors" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {!visitors || visitors.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-white/40">
              <UserPlus className="h-4 w-4 text-white/20 shrink-0" />
              No upcoming visitors
            </div>
          ) : (
            <ul className="space-y-2">
              {visitors.slice(0, 2).map((v) => (
                <li key={v._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-teal-400/10 flex items-center justify-center shrink-0">
                    <span className="text-xs text-teal-400 font-medium">{v.visitorName?.[0]?.toUpperCase() ?? "?"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{v.visitorName}</p>
                    <p className="text-xs text-white/40 font-mono">{formatDateTime(v.expectedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Row 5 — Alerts (full width, always rendered) */}
      <motion.div variants={item}>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Society alerts</span>
              {alerts && alerts.length > 0 && (
                <Badge variant={criticalAlerts.length > 0 ? "critical" : "warning"}>{alerts.length}</Badge>
              )}
            </div>
          </div>
          {!alerts || alerts.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-sm text-white/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              All clear — no active alerts for your block
            </div>
          ) : (
            <ul className="space-y-1.5">
              {alerts.slice(0, 3).map((alert, i) => (
                <motion.li
                  key={alert._id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-2 ${alert.severity === "critical" ? "bg-red-400/[0.05] border-l-red-400/60" : "bg-amber-400/[0.04] border-l-amber-400/40"}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{alert.title}</p>
                    <p className="text-xs text-white/40 font-mono mt-0.5">{formatDateTime(alert.triggeredAt)}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ResidentHomePage() {
  return (
    <Suspense>
      <ResidentHomePageInner />
    </Suspense>
  );
}
