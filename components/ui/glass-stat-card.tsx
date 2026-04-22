"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface GlassStatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  color: string;
  href?: string;
  index?: number;
}

export function GlassStatCard({ label, value, sub, icon: Icon, color, index = 0 }: GlassStatCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-5 cursor-default"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(255,255,255,0.07)`,
        backdropFilter: "blur(12px)",
      }}
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.07 }}
      whileHover={{
        borderColor: color + "40",
        backgroundColor: color + "08",
        y: -2,
        boxShadow: `0 8px 32px ${color}18`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-20"
        style={{ background: color, filter: "blur(24px)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
            {label}
          </span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</div>}
      </div>
    </motion.div>
  );
}
