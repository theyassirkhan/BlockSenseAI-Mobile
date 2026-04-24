"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import QRCode from "qrcode";
import { Shield, Clock, MapPin, User, CheckCircle2, XCircle } from "lucide-react";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function GatepassInner() {
  const { passCode } = useParams<{ passCode: string }>();
  const visitor = useQuery(api.visitors.getByPassCode, passCode ? { passCode } : "skip");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !passCode) return;
    QRCode.toCanvas(canvasRef.current, passCode, {
      width: 220,
      margin: 2,
      color: { dark: "#1a1040", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
  }, [passCode]);

  if (visitor === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0612]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (visitor === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0612] p-6">
        <div className="text-center space-y-3">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-white font-bold text-lg">Invalid Gate Pass</p>
          <p className="text-gray-400 text-sm">This pass code doesn't exist or has expired.</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = !!visitor.checkedInAt;
  const isCheckedOut = !!visitor.checkedOutAt;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0a0612 0%, #130a2e 50%, #0a0612 100%)" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #1a0f3d 0%, #0f0829 100%)",
          border: "1px solid rgba(168,85,247,0.3)",
          boxShadow: "0 0 60px rgba(168,85,247,0.15), 0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header strip */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7, #6366f1)" }}
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-none">BlockSense AI</p>
            <p className="text-purple-200 text-[11px] mt-0.5">Digital Gate Pass</p>
          </div>
          <div className="ml-auto">
            {isCheckedOut ? (
              <span className="text-[10px] bg-gray-500/50 text-gray-200 px-2 py-1 rounded-full font-medium">Used</span>
            ) : isCheckedIn ? (
              <span className="text-[10px] bg-green-500/30 text-green-200 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Checked In
              </span>
            ) : (
              <span className="text-[10px] bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full font-medium">Valid</span>
            )}
          </div>
        </div>

        {/* Society name */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2 text-purple-300">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <p className="text-sm font-semibold truncate">{visitor.societyName}</p>
          </div>
        </div>

        {/* Visitor info */}
        <div className="px-6 pb-4 space-y-3">
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                {visitor.visitorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white text-base leading-none">{visitor.visitorName}</p>
                <p className="text-purple-300/70 text-xs mt-0.5">{visitor.visitorPhone}</p>
              </div>
            </div>

            <div className="h-px" style={{ background: "rgba(168,85,247,0.15)" }} />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-purple-400/60 uppercase tracking-wide text-[10px]">Visiting</p>
                <p className="text-white font-semibold mt-0.5">Flat {visitor.flatNumber}</p>
                <p className="text-purple-300/70">{visitor.residentName}</p>
              </div>
              <div>
                <p className="text-purple-400/60 uppercase tracking-wide text-[10px]">Expected</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-purple-400" />
                  <p className="text-white font-semibold">{formatTime(visitor.expectedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR code */}
        <div className="flex flex-col items-center pb-5 px-6 gap-3">
          <div
            className="rounded-2xl p-3"
            style={{ background: "#ffffff", border: "3px solid rgba(168,85,247,0.4)", boxShadow: "0 0 30px rgba(168,85,247,0.2)" }}
          >
            <canvas ref={canvasRef} style={{ display: "block", borderRadius: "8px" }} />
          </div>

          {/* Pass code */}
          <div className="text-center">
            <p className="text-purple-400/60 text-[10px] uppercase tracking-widest">Pass Code</p>
            <p className="font-mono font-bold text-2xl text-white tracking-[0.3em] mt-0.5">{visitor.passCode}</p>
          </div>

          <p className="text-purple-400/40 text-[10px] text-center">
            Show this QR to the security guard at the gate
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(168,85,247,0.1)" }}
        >
          <p className="text-[10px] text-purple-400/50">Valid for single entry</p>
          <p className="text-[10px] text-purple-400/50">blocksense.ai</p>
        </div>
      </div>
    </div>
  );
}

export default function GatepassPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0612]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    }>
      <GatepassInner />
    </Suspense>
  );
}
