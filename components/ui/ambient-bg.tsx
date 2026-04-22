"use client";

import { motion } from "framer-motion";

export function AmbientBg() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, top: "-10%", right: "-5%", background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 400, height: 400, bottom: "10%", left: "-5%", background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}
