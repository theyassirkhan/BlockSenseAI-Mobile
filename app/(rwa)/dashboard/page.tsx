"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfReportButton } from "@/components/ui/pdf-report";
import { formatDateTime } from "@/lib/utils";
import {
  Droplets, Zap, AlertTriangle, CheckCircle2, Flame, Wind,
  Trash2, Truck, TrendingUp, TrendingDown, Users2,
  CreditCard, ClipboardList, Loader2, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] h-full hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
        <Icon className={`h-4 w-4 ${iconClass ?? "text-white/30"}`} />
      </div>
      <p className="font-mono text-2xl text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-white/40 truncate">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function UtilityTile({
  href,
  icon: Icon,
  iconClass,
  borderClass,
  label,
  value,
  sub,
  trend,
}: {
  href: string;
  icon: React.ElementType;
  iconClass: string;
  borderClass: string;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | null;
}) {
  return (
    <Link href={href} className="block">
      <div className={`flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] border-l-2 ${borderClass} hover:bg-white/[0.05] transition-colors h-full`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
          {trend === "up" && <TrendingUp className="h-3 w-3 text-red-400 ml-auto" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-400 ml-auto" />}
        </div>
        <p className="font-mono text-xl text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-white/30 truncate">{sub}</p>}
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  headline,
  description,
  cta,
  onCta,
  href,
}: {
  icon: React.ElementType;
  headline: string;
  description: string;
  cta?: string;
  onCta?: () => void;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Icon className="h-8 w-8 text-white/20" />
      <p className="text-sm font-medium text-white/60">{headline}</p>
      <p className="text-xs text-white/30">{description}</p>
      {cta && href && (
        <Link href={href}>
          <Button size="sm" variant="outline" className="border-white/10 hover:border-white/20">{cta}</Button>
        </Link>
      )}
      {cta && onCta && (
        <Button size="sm" variant="outline" className="border-white/10 hover:border-white/20" onClick={onCta}>{cta}</Button>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-white/40 uppercase tracking-widest mb-3">{children}</p>;
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const seedAllDemoData = useMutation(api.demo.seedAllDemoData);
  const setupDone = useRef(false);
  const [seeding, setSeeding] = useState(false);

  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    const setup = searchParams.get("setup") as "admin" | "rwa" | "resident" | null;
    if (!setup || setupDone.current) return;
    setupDone.current = true;
    setupDemoUser({ role: setup })
      .then(() => seedAllDemoData({}))
      .catch(() => {})
      .finally(() => router.replace("/dashboard"));
  }, [searchParams]);

  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const tanks = useQuery(api.water.getTankLevels, societyId && blockId ? { societyId, blockId } : "skip");
  const waterPred = useQuery(api.water.getWaterPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const dgPred = useQuery(api.power.getDieselPrediction, societyId && blockId ? { societyId, blockId } : "skip");
  const alerts = useQuery(api.alerts.getActiveAlerts, societyId && blockId ? { societyId, blockId } : "skip");
  const gasLatest = useQuery(api.gas.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const sewageLatest = useQuery(api.sewage.getLatest, societyId && blockId ? { societyId, blockId } : "skip");
  const garbageSchedule = useQuery(api.garbage.getSchedule, societyId && blockId ? { societyId, blockId } : "skip");
  const wasteLog = useQuery(api.waste.getRecentLogs, societyId && blockId ? { societyId, blockId } : "skip");
  const complaints = useQuery(api.complaints.getBySociety, societyId ? { societyId } : "skip");
  const paymentSummary = useQuery(api.payments.getSummary, societyId ? { societyId } : "skip");

  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const shifts = useQuery(api.shifts.getWeek, societyId ? { societyId, weekStart: todayStart } : "skip");

  const isLoading = profile === undefined || tanks === undefined;
  const criticalAlerts = alerts?.filter(a => a.severity === "critical") ?? [];
  const openComplaints = (complaints ?? []).filter(c => c.status === "open" || c.status === "under_review");
  const todayShifts = (shifts ?? []).filter(s => s.date >= todayStart && s.date < todayStart + 86400000);

  const hasNoData =
    tanks?.length === 0 &&
    (!dgPred || dgPred.length === 0) &&
    !gasLatest &&
    !sewageLatest;

  async function handleSeedData() {
    setSeeding(true);
    try {
      const result = await seedAllDemoData({});
      if ((result as any)?.skipped) toast.info("Demo data already seeded");
      else toast.success("90 days of demo data seeded successfully");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const nextGarbage = garbageSchedule?.[0];
  const lastWaste = wasteLog?.[0];
  const collectionPct = paymentSummary && (paymentSummary.collectedCount + paymentSummary.overdueCount) > 0
    ? Math.round((paymentSummary.collectedCount / (paymentSummary.collectedCount + paymentSummary.overdueCount)) * 100)
    : null;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Critical alert banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-300">
              {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} — {criticalAlerts[0]?.title}
            </span>
          </div>
          <Link href="/dashboard/alerts" className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">View all →</Link>
        </motion.div>
      )}

      {/* Row 1 — Society header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-medium text-white truncate">{profile?.name ?? "Dashboard"}</h1>
          <p className="text-xs text-white/40 font-mono mt-0.5">
            Updated {formatDateTime(Date.now())}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {societyId && blockId && (
            <PdfReportButton societyId={societyId} blockId={blockId} societyName={profile?.name ?? "Society"} />
          )}
          {process.env.NODE_ENV === "development" && hasNoData && (
            <Button size="sm" variant="outline" onClick={handleSeedData} disabled={seeding} className="border-white/10 hover:border-teal-500/50 hover:bg-teal-500/10">
              {seeding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
              Load demo data
            </Button>
          )}
        </div>
      </motion.div>

      {/* Row 2 — KPI cards */}
      <motion.div variants={item}>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Collection rate"
            value={collectionPct !== null ? `${collectionPct}%` : "—"}
            sub={paymentSummary ? `₹${paymentSummary.totalCollectedThisMonth.toLocaleString()} this month` : "No payment data"}
            icon={CreditCard}
            iconClass="text-teal-400"
            href="/dashboard/payments"
          />
          <KpiCard
            label="Open complaints"
            value={openComplaints.length}
            sub={openComplaints.length === 0 ? "All resolved" : `${openComplaints.length} need attention`}
            icon={ClipboardList}
            iconClass="text-orange-400"
            href="/dashboard/complaints"
          />
          <KpiCard
            label="Active alerts"
            value={alerts?.length ?? 0}
            sub={criticalAlerts.length > 0 ? `${criticalAlerts.length} critical` : "All clear"}
            icon={AlertTriangle}
            iconClass={criticalAlerts.length > 0 ? "text-red-400" : "text-white/30"}
            href="/dashboard/alerts"
          />
          <KpiCard
            label="Staff on duty"
            value={todayShifts.length}
            sub={todayShifts.length === 0 ? "No shifts today" : `${todayShifts.length} scheduled`}
            icon={Users2}
            iconClass="text-blue-400"
            href="/dashboard/staff"
          />
        </div>
      </motion.div>

      {/* Row 3 — Utility tiles */}
      <motion.div variants={item}>
        <SectionLabel>Utilities</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <UtilityTile
            href="/dashboard/water"
            icon={Droplets}
            iconClass="text-blue-400"
            borderClass="border-l-blue-500/60"
            label="Water"
            value={tanks && tanks.length > 0 ? `${tanks[0].currentLevelPct}%` : "—"}
            sub={tanks && tanks.length > 0 ? tanks[0].name : "No tanks configured"}
          />
          <UtilityTile
            href="/dashboard/power"
            icon={Zap}
            iconClass="text-amber-400"
            borderClass="border-l-amber-500/60"
            label="Diesel"
            value={dgPred && dgPred.length > 0 ? `${dgPred[0].levelPct}%` : "—"}
            sub={dgPred && dgPred.length > 0 ? `${dgPred[0].hoursRemaining}h remaining` : "No DG units"}
          />
          <UtilityTile
            href="/dashboard/gas"
            icon={Flame}
            iconClass="text-orange-400"
            borderClass="border-l-orange-500/60"
            label="Gas"
            value={gasLatest ? `${gasLatest.pressurePSI} PSI` : "—"}
            sub={gasLatest ? `${gasLatest.meterReading} SCM meter` : "No readings"}
          />
          <UtilityTile
            href="/dashboard/sewage"
            icon={Wind}
            iconClass="text-slate-400"
            borderClass="border-l-slate-500/60"
            label="Sewage STP"
            value={sewageLatest ? sewageLatest.stpStatus : "—"}
            sub={sewageLatest ? `Sludge ${sewageLatest.sludgeTankPct}%` : "No readings"}
          />
          <UtilityTile
            href="/dashboard/waste"
            icon={Trash2}
            iconClass="text-teal-400"
            borderClass="border-l-teal-500/60"
            label="Waste"
            value={lastWaste ? `${lastWaste.totalKG} KG` : "—"}
            sub={lastWaste ? formatDateTime(lastWaste.loggedAt) : "No logs"}
          />
          <UtilityTile
            href="/dashboard/garbage"
            icon={Truck}
            iconClass="text-purple-400"
            borderClass="border-l-purple-500/60"
            label="Garbage"
            value={nextGarbage ? "Scheduled" : "—"}
            sub={nextGarbage ? formatDateTime(nextGarbage.scheduledAt) : "No pickups scheduled"}
          />
        </div>
      </motion.div>

      {/* Row 4 — Water outlook + Active alerts */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Water outlook */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Water outlook</span>
            </div>
            <Link href="/dashboard/water" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">Details →</Link>
          </div>
          {waterPred ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Days until critical",
                  value: String(waterPred.daysUntilCritical),
                  valueClass: waterPred.daysUntilCritical < 3 ? "text-red-400" : waterPred.daysUntilCritical < 7 ? "text-amber-400" : "text-emerald-400",
                },
                {
                  label: "Avg daily use",
                  value: `${waterPred.avgDailyConsumption} KL`,
                  valueClass: "text-white",
                },
              ].map(({ label, value, valueClass }) => (
                <div key={label} className="rounded-lg p-3 bg-white/[0.03]">
                  <p className="text-xs text-white/40 mb-1">{label}</p>
                  <p className={`font-mono text-2xl ${valueClass}`}>{value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-lg p-3 bg-white/[0.03] flex items-center justify-between">
                <p className="text-xs text-white/40">Recommended order date</p>
                <p className="text-xs font-medium text-white font-mono">{new Date(waterPred.recommendedOrderDate).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Droplets}
              headline="No water data yet"
              description="Add your first reading to see consumption predictions"
              cta="Add reading"
              href="/dashboard/water"
            />
          )}
        </div>

        {/* Active alerts */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Active alerts</span>
              {alerts && alerts.length > 0 && (
                <Badge variant={criticalAlerts.length > 0 ? "critical" : "warning"} className="ml-1">{alerts.length}</Badge>
              )}
            </div>
            <Link href="/dashboard/alerts" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {!alerts || alerts.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-white/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              All clear — no active alerts
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 4).map((alert, i) => (
                <motion.li
                  key={alert._id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-400" : alert.severity === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{alert.title}</p>
                    <p className="text-xs text-white/40 font-mono">{formatDateTime(alert.triggeredAt)}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Row 5 — Recent complaints + Staff on duty */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recent complaints */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-white">Recent complaints</span>
            </div>
            <Link href="/dashboard/complaints" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {!complaints || complaints.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-white/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              No complaints on record
            </div>
          ) : (
            <ul className="space-y-2">
              {complaints.slice(0, 3).map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <p className="text-sm text-white truncate flex-1">{c.subject}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    c.status === "open" ? "bg-red-400/15 text-red-400" :
                    c.status === "under_review" ? "bg-amber-400/15 text-amber-400" :
                    "bg-emerald-400/15 text-emerald-400"
                  }`}>
                    {c.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Staff on duty */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Staff on duty today</span>
            </div>
            <Link href="/dashboard/staff" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {todayShifts.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-white/50">
              <Users2 className="h-4 w-4 text-white/20 shrink-0" />
              No shifts scheduled today
            </div>
          ) : (
            <ul className="space-y-2">
              {todayShifts.slice(0, 4).map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-mono truncate">{s.startTime} – {s.endTime}</p>
                    <p className="text-xs text-white/40">{s.shiftType}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    s.status === "present" ? "bg-emerald-400/15 text-emerald-400" :
                    s.status === "absent" ? "bg-red-400/15 text-red-400" :
                    "bg-white/10 text-white/50"
                  }`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  );
}
