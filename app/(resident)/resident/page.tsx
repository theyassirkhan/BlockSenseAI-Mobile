"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlassStatCard } from "@/components/ui/glass-stat-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { formatDateTime, levelColor } from "@/lib/utils";
import {
  Droplets, Zap, Flame, Wind, CreditCard,
  ClipboardList, Bell, CheckCircle2, AlertTriangle, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  const sewageLatest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const dues = useQuery(api.payments.getMyDues, societyId ? { societyId } : "skip");
  const myRequests = useQuery(api.serviceRequests.getMyRequests, societyId ? { societyId } : "skip");
  const alerts = useQuery(api.alerts.getActiveAlerts, societyId && blockId ? { societyId, blockId } : "skip");

  const pendingDues = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
  const openRequests = (myRequests ?? []).filter(r => r.status === "open" || r.status === "in_progress");

  const stats = [
    {
      label: "Water", icon: Droplets, color: "#38BDF8",
      value: tanks && tanks.length > 0 ? `${tanks[0].currentLevelPct}%` : "—",
      sub: tanks && tanks.length > 0 ? "Tank level" : "No data",
    },
    {
      label: "Diesel", icon: Zap, color: "#F59E0B",
      value: dgPred && dgPred.length > 0 ? `${dgPred[0].levelPct}%` : "—",
      sub: dgPred && dgPred.length > 0 ? `${dgPred[0].hoursRemaining}h left` : "No data",
    },
    {
      label: "Gas", icon: Flame, color: "#34D399",
      value: gasLatest ? `${gasLatest.pressurePSI}` : "—",
      sub: gasLatest ? "PSI" : "No readings",
    },
    {
      label: "Alerts", icon: Bell, color: alerts && alerts.length > 0 ? "#EF4444" : "#A855F7",
      value: alerts?.length ?? 0,
      sub: alerts && alerts.length > 0 ? "Active" : "All clear",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {profile?.flatNumber ? `Flat ${profile.flatNumber}` : "Your community dashboard"}
        </p>
      </motion.div>

      {/* Action banners */}
      {(pendingDues.length > 0 || openRequests.length > 0) && (
        <div className="space-y-2">
          {pendingDues.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Link href="/resident/payments">
                <motion.div
                  className="rounded-xl p-3.5 flex items-center justify-between cursor-pointer"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
                  whileHover={{ backgroundColor: "rgba(245,158,11,0.15)", x: 2 }}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm font-medium text-amber-300">
                      {pendingDues.length} payment{pendingDues.length > 1 ? "s" : ""} pending
                    </span>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold">Pay now →</span>
                </motion.div>
              </Link>
            </motion.div>
          )}
          {openRequests.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Link href="/resident/requests">
                <motion.div
                  className="rounded-xl p-3.5 flex items-center justify-between cursor-pointer"
                  style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}
                  whileHover={{ backgroundColor: "rgba(56,189,248,0.15)", x: 2 }}
                >
                  <div className="flex items-center gap-2.5">
                    <ClipboardList className="h-4 w-4 text-sky-400 shrink-0" />
                    <span className="text-sm font-medium text-sky-300">
                      {openRequests.length} request{openRequests.length > 1 ? "s" : ""} in progress
                    </span>
                  </div>
                  <span className="text-xs text-sky-400 font-semibold">Track →</span>
                </motion.div>
              </Link>
            </motion.div>
          )}
        </div>
      )}

      {/* Utility stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, icon, color, value, sub }, i) => (
          <Link key={label} href="/resident/utilities">
            <GlassStatCard label={label} value={value} sub={sub} icon={icon} color={color} index={i} />
          </Link>
        ))}
      </div>

      {/* Alerts card */}
      {alerts && alerts.length > 0 && (
        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-yellow-400" />
                  Society alerts
                  <Badge variant="warning">{alerts.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {alerts.slice(0, 3).map((alert, i) => (
                  <motion.li
                    key={alert._id}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-400" : "bg-yellow-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{alert.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{formatDateTime(alert.triggeredAt)}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Sewage status */}
      {sewageLatest && (
        <ScrollReveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-orange-400" />
                Sewage & STP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sewageLatest.stpStatus === "normal" ? "bg-emerald-400/15 text-emerald-400 border border-emerald-400/25" : "bg-red-400/15 text-red-400 border border-red-400/25"}`}>
                  {sewageLatest.stpStatus === "normal" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {sewageLatest.stpStatus}
                </div>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Sludge: {sewageLatest.sludgeTankPct}%</span>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}

export default function ResidentHomePage() {
  return (
    <Suspense>
      <ResidentHomePageInner />
    </Suspense>
  );
}
