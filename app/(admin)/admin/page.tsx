"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, AlertTriangle, CheckCircle2, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

const PLAN_COLOR: Record<string, string> = {
  basic: "#6b7280",
  pro: "#185FA5",
  enterprise: "#0F6E56",
};

export default function AdminPage() {
  const societies = useQuery(api.societies_internal.listAll, {});
  const allTickets = useQuery(api.adminTickets.getAll, {});

  if (!societies) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const activeSocieties = societies.filter((s) => s.isActive !== false);
  const openTickets = allTickets?.filter((t) => t.status === "open") ?? [];
  const urgentTickets = openTickets.filter((t) => t.priority === "urgent");

  const kpis = [
    {
      label: "Total Societies",
      value: societies.length,
      sub: `${activeSocieties.length} active`,
      icon: Building2,
      color: "#0F6E56",
    },
    {
      label: "Open Tickets",
      value: openTickets.length,
      sub: urgentTickets.length > 0 ? `${urgentTickets.length} urgent` : "No urgent",
      icon: AlertTriangle,
      color: urgentTickets.length > 0 ? "#A32D2D" : "#3B6D11",
    },
    {
      label: "Platform MRR",
      value: `₹${(societies.reduce((s, soc) => s + (soc.mrr ?? 0), 0) / 1000).toFixed(0)}K`,
      sub: "Monthly recurring",
      icon: TrendingUp,
      color: "#185FA5",
    },
    {
      label: "Plan Distribution",
      value: societies.filter((s) => s.subscriptionPlan === "pro").length,
      sub: "Pro tier societies",
      icon: Activity,
      color: "#854F0B",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All societies on BlockSense</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Society health grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Society Grid</h2>
          <Link href="/admin/societies" className="text-xs text-primary hover:underline">Manage all →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {societies.map((society) => (
            <Link key={society._id} href={`/admin/societies`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{society.name}</p>
                      <p className="text-xs text-muted-foreground">{society.city}</p>
                    </div>
                    <Badge
                      className="text-[10px] shrink-0 ml-2"
                      style={{
                        backgroundColor: `${PLAN_COLOR[society.subscriptionPlan]}20`,
                        color: PLAN_COLOR[society.subscriptionPlan],
                        border: `1px solid ${PLAN_COLOR[society.subscriptionPlan]}40`,
                      }}
                    >
                      {society.subscriptionPlan}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{society.totalFlats ?? "—"} flats</span>
                    <span className={society.isActive === false ? "text-destructive" : "text-success"}>
                      {society.isActive === false ? "Suspended" : "Active"}
                    </span>
                  </div>
                  {society.createdAt && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Added {formatDateTime(society.createdAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {societies.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              No societies on platform yet.{" "}
              <Link href="/admin/societies" className="text-primary hover:underline">Add one →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent tickets */}
      {openTickets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Open Tickets ({openTickets.length})
              </CardTitle>
              <Link href="/admin/tickets" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {openTickets.slice(0, 5).map((ticket) => (
                <li key={ticket._id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.category}</p>
                  </div>
                  <Badge
                    variant={ticket.priority === "urgent" ? "critical" : ticket.priority === "high" ? "warning" : "secondary"}
                    className="ml-2 shrink-0 text-[10px]"
                  >
                    {ticket.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
