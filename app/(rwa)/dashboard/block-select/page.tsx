"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveBlock } from "@/hooks/use-active-block";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, AlertTriangle } from "lucide-react";

export default function BlockSelectPage() {
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);
  const blocks = useQuery(
    api.societies.getBlocks,
    profile?.societyId ? { societyId: profile.societyId } : "skip"
  );
  const alerts = useQuery(
    api.alerts.getActiveAlerts,
    profile?.societyId && profile?.blockId
      ? { societyId: profile.societyId, blockId: profile.blockId }
      : "skip"
  );

  const { setBlockId } = useActiveBlock();

  function selectBlock(blockId: Id<"blocks">) {
    setBlockId(blockId);
    router.push("/dashboard");
  }

  const BLOCK_TYPE_COLORS: Record<string, string> = {
    block: "bg-blue-50 text-blue-700",
    wing: "bg-purple-50 text-purple-700",
    villa: "bg-amber-50 text-amber-700",
    tower: "bg-green-50 text-green-700",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">BS</span>
            </div>
            <h1 className="text-xl font-bold">Select a block</h1>
          </div>
          <p className="text-sm text-muted-foreground">Choose which block to manage</p>
        </div>

        {!blocks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No blocks found. Add blocks in onboarding or settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {blocks.map((block) => (
              <button
                key={block._id}
                onClick={() => selectBlock(block._id)}
                className="group text-left bg-card rounded-lg border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${BLOCK_TYPE_COLORS[block.type] ?? "bg-muted text-muted-foreground"}`}>
                    {block.type}
                  </div>
                  <AlertTriangle className="h-4 w-4 text-warning opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1">{block.name}</h3>
                {block.totalFlats && (
                  <p className="text-xs text-muted-foreground">{block.totalFlats} flats</p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage block →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
