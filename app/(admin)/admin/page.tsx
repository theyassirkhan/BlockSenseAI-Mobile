"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassStatCard } from "@/components/ui/glass-stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Building2, AlertTriangle, TrendingUp, Activity, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const PLAN_COLOR: Record<string, string> = {
  basic: "#71717A",
  pro: "#38BDF8",
  enterprise: "#A855F7",
};

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const seedAllDemoData = useMutation(api.demo.seedAllDemoData);
  const seedExtraSocieties = useMutation(api.demo.seedExtraSocieties);
  const setupDone = useRef(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    const setup = searchParams.get("setup");
    if (!setup || setupDone.current) return;
    setupDone.current = true;
    setupDemoUser({ role: "admin" })
      .then(() => seedAllDemoData({}))
      .then(() => seedExtraSocieties({}))
      .then(() => router.replace("/admin"))
      .catch(console.error);
  }, [searchParams]);

  const societies = useQuery(api.societies_internal.listAll, {});
  const allTickets = useQuery(api.adminTickets.getAll, {});
  const allUsers = useQuery(api.users.listAll, {});

  if (!societies) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const activeSocieties = societies.filter(s => s.isActive !== false);
  const openTickets = allTickets?.filter(t => t.status === "open") ?? [];
  const urgentTickets = openTickets.filter(t => t.priority === "urgent");
  const totalMrr = societies.reduce((s, soc) => s + (soc.mrr ?? 0), 0);

  const totalUsers = allUsers?.length ?? 0;
  const kpis = [
    { label: "Total Societies", value: societies.length, sub: `${activeSocieties.length} active`, icon: Building2, color: "#A855F7" },
    { label: "Total Users", value: totalUsers, sub: "Across all societies", icon: Users, color: "#34D399" },
    { label: "Platform MRR", value: `₹${(totalMrr / 1000).toFixed(0)}K`, sub: "Monthly recurring", icon: TrendingUp, color: "#38BDF8" },
    { label: "Open Tickets", value: openTickets.length, sub: urgentTickets.length > 0 ? `${urgentTickets.length} urgent` : "None urgent", icon: AlertTriangle, color: urgentTickets.length > 0 ? "#EF4444" : "#34D399" },
  ];

  // Society growth chart (by month)
  const societyGrowthChart = (() => {
    const now = new Date();
    const result: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const count = societies.filter(s => s.createdAt && s.createdAt < end).length;
      result.push({ month: label, count });
    }
    return result;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Platform Overview" subtitle="All societies on BlockSense" />
        <button
          disabled={seeding}
          onClick={async () => {
            setSeeding(true);
            setSeedMsg("");
            try {
              const r = await seedExtraSocieties({});
              setSeedMsg((r as any).results?.join(" · ") ?? "Done");
            } catch (e: any) {
              setSeedMsg(e.message ?? "Error");
            } finally {
              setSeeding(false);
            }
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors disabled:opacity-50"
        >
          {seeding ? "Seeding…" : "Seed Extra Societies"}
        </button>
      </div>
      {seedMsg && <p className="text-xs text-muted-foreground">{seedMsg}</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon, color }, i) => (
          <GlassStatCard key={label} label={label} value={value} sub={sub} icon={icon} color={color} index={i} />
        ))}
      </div>

      {/* Society grid */}
      <ScrollReveal delay={0.1}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Society Grid</h2>
          <Link href="/admin/societies" className="text-xs text-primary hover:underline">Manage all →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {societies.map((society, i) => (
            <motion.div
              key={society._id}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
              whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(168,85,247,0.12)" }}
            >
              <Link href="/admin/societies">
                <Card className="cursor-pointer h-full">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{society.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{society.city}</p>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2"
                        style={{
                          background: `${PLAN_COLOR[society.subscriptionPlan]}18`,
                          color: PLAN_COLOR[society.subscriptionPlan],
                          border: `1px solid ${PLAN_COLOR[society.subscriptionPlan]}30`,
                        }}
                      >
                        {society.subscriptionPlan}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{society.totalFlats ?? "—"} flats</span>
                      <span className={society.isActive === false ? "text-red-400" : "text-emerald-400"}>
                        {society.isActive === false ? "Suspended" : "Active"}
                      </span>
                    </div>
                    {society.createdAt && (
                      <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Added {formatDateTime(society.createdAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
          {societies.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              No societies yet.{" "}
              <Link href="/admin/societies" className="text-primary hover:underline">Add one →</Link>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Society growth chart */}
      <ScrollReveal delay={0.12}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              Society Growth (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={societyGrowthChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, "Societies"]}
                />
                <Bar dataKey="count" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Recent tickets */}
      {openTickets.length > 0 && (
        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Open Tickets ({openTickets.length})
                </CardTitle>
                <Link href="/admin/tickets" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {openTickets.slice(0, 5).map((ticket, i) => (
                  <motion.li
                    key={ticket._id}
                    className="flex items-center justify-between p-2.5 rounded-xl transition-colors hover:bg-white/5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{ticket.category}</p>
                    </div>
                    <Badge
                      variant={ticket.priority === "urgent" ? "critical" : ticket.priority === "high" ? "warning" : "secondary"}
                      className="ml-3 shrink-0 text-[10px]"
                    >
                      {ticket.priority}
                    </Badge>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}
