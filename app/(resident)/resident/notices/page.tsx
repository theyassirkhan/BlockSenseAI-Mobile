"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const TYPE_COLOR: Record<string, "critical" | "warning" | "secondary" | "default"> = {
  emergency: "critical",
  maintenance: "warning",
  general: "secondary",
  event: "default",
  financial: "secondary",
};

export default function ResidentNoticesPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const notices = useQuery(api.notices.getBySociety, societyId ? { societyId } : "skip");

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Notices
      </h1>

      <div className="space-y-3">
        {(notices ?? []).map(n => (
          <Card key={n._id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <Badge variant={TYPE_COLOR[n.type] ?? "secondary"} className="text-[10px] capitalize">{n.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!(notices ?? []).length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No notices at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
