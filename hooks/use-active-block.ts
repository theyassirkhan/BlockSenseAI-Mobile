"use client";

import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

const KEY = "blocksense_active_block_id";

export function useActiveBlock(defaultBlockId?: Id<"blocks">) {
  const [blockId, setBlockIdState] = useState<Id<"blocks"> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      setBlockIdState(stored as Id<"blocks">);
    } else if (defaultBlockId) {
      setBlockIdState(defaultBlockId);
    }
  }, [defaultBlockId]);

  const setBlockId = (id: Id<"blocks">) => {
    localStorage.setItem(KEY, id);
    setBlockIdState(id);
  };

  const clearBlockId = () => {
    localStorage.removeItem(KEY);
    setBlockIdState(null);
  };

  return { blockId, setBlockId, clearBlockId };
}
