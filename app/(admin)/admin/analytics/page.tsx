"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Building2 } from "lucide-react";

export default function AdminAnalyticsPage() {
  const societies = useQuery(api.societies_internal.listAll, {});

  const byPlan = societies?.reduce((acc, s) => {
    acc[s.subscriptionPlan] = (acc[s.subscriptionPlan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const byCity = societies?.reduce((acc, s) => {
    acc[s.city] = (acc[s.city] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const totalMRR = societies?.reduce((s, soc) => s + (soc.mrr ?? 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Platform Analytics
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Societies", value: societies?.length ?? 0, icon: Building2 },
          { label: "Total Flats", value: societies?.reduce((s, soc) => s + (soc.totalFlats ?? 0), 0) ?? 0, icon: Users },
          { label: "Monthly MRR", value: `₹${(totalMRR / 1000).toFixed(0)}K`, icon: TrendingUp },
          { label: "Active Cities", value: Object.keys(byCity).length, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue by Plan</CardTitle></CardHeader>
          <CardContent>
            {(Object.entries(byPlan) as [string, number][]).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between mb-3">
                <span className="text-sm capitalize font-medium">{plan}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-primary/20 w-24 relative">
                    <div
                      className="h-2 rounded-full bg-primary absolute left-0 top-0"
                      style={{ width: `${((count / (societies?.length ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(byPlan).length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Societies by city */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Societies by City</CardTitle></CardHeader>
          <CardContent>
            {(Object.entries(byCity) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([city, count]) => (
                <div key={city} className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{city}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-muted w-24 relative">
                      <div
                        className="h-2 rounded-full bg-primary/60 absolute left-0 top-0"
                        style={{ width: `${(count / (societies?.length ?? 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {Object.keys(byCity).length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
