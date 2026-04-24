"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Pin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_COLOR: Record<string, "critical" | "warning" | "secondary" | "default"> = {
  emergency: "critical",
  maintenance: "warning",
  general: "secondary",
  payment: "default",
};

export default function ResidentNoticesPage() {
  const profile = useQuery(api.users.getMyProfile);
  const societyId = profile?.societyId;
  const notices = useQuery(api.notices.getBySociety, societyId ? { societyId } : "skip");
  const myAcks = useQuery(api.notices.getMyAcks, societyId ? { societyId } : "skip");
  const acknowledge = useMutation(api.notices.acknowledge);

  const ackedSet = new Set(myAcks ?? []);

  async function handleAck(noticeId: any) {
    try {
      await acknowledge({ noticeId });
      toast.success("Marked as read");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Notices
      </h1>

      <div className="space-y-3">
        {(notices ?? []).map(n => {
          const isAcked = ackedSet.has(n._id);
          return (
            <Card key={n._id} className={isAcked ? "opacity-60" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {n.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <p className="font-semibold text-sm">{n.title}</p>
                      <Badge variant={TYPE_COLOR[n.type] ?? "secondary"} className="text-[10px] capitalize">{n.type}</Badge>
                      {isAcked && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CheckCheck className="h-3 w-3" /> Read
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!isAcked && (
                    <button
                      onClick={() => handleAck(n._id)}
                      className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark read
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
