"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Shield, UserPlus, Search, LogOut, LogIn, Camera, CheckCircle2, Clock, Loader2, History, VideoOff, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense } from "react";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function GuardPageInner() {
  const [settingUp, setSettingUp] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const setupDemoUser = useMutation(api.demo.setupDemoUser);
  const seedAllDemoData = useMutation(api.demo.seedAllDemoData);
  const searchParams = useSearchParams();
  const setupDone = useRef(false);

  useEffect(() => {
    const setup = searchParams.get("setup");
    if (setup !== "guard" || setupDone.current) return;
    setupDone.current = true;
    setSettingUp(true);
    setupDemoUser({ role: "guard" })
      .then(() => seedAllDemoData({}))
      .catch(() => {})
      .finally(() => setSettingUp(false));
  }, []);

  const societyId = profile?.societyId as any;

  if (settingUp || profile === undefined) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center gap-3 text-white">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
        <span className="text-sm">{settingUp ? "Setting up guard demo…" : "Loading…"}</span>
      </div>
    );
  }

  if (!societyId) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
          <Shield className="h-10 w-10 text-orange-400 mx-auto" />
          <h1 className="font-bold text-lg text-white">Guard Access Required</h1>
          <p className="text-sm text-gray-400">Your account is not linked to a society. Ask your RWA admin to assign your account.</p>
        </div>
      </div>
    );
  }

  return <GuardDashboard societyId={societyId} />;
}

function GuardDashboard({ societyId }: { societyId: any }) {
  const [tab, setTab] = useState<"log" | "walkin" | "scan" | "history" | "stats">("log");
  const todayLog = useQuery(api.visitors.getTodayLog, { societyId });
  const history = useQuery(api.visitors.getHistory, (tab === "history" || tab === "stats") ? { societyId, limit: 200 } : "skip");
  const checkIn = useMutation(api.visitors.checkIn);
  const checkOut = useMutation(api.visitors.checkOut);

  const inside = (todayLog ?? []).filter(v => v.checkedInAt && !v.checkedOutAt).length;
  const total = todayLog?.length ?? 0;

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <span className="font-bold">Guard Post</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="text-green-400 font-medium">{inside} inside</span>
          <span>{total} today</span>
        </div>
      </div>

      <div className="flex border-b border-gray-800 bg-gray-900 overflow-x-auto">
        {(["log", "walkin", "scan", "history", "stats"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-[64px] py-3 text-xs font-medium transition-colors whitespace-nowrap px-2 ${tab === t ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t === "log" ? "Today" : t === "walkin" ? "Walk-in" : t === "scan" ? "Scan" : t === "history" ? "History" : "Stats"}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "log" && (
          <TodayLog visitors={todayLog ?? []} onCheckIn={checkIn} onCheckOut={checkOut} />
        )}
        {tab === "walkin" && <WalkInForm societyId={societyId} onDone={() => setTab("log")} />}
        {tab === "scan" && <ScanPass societyId={societyId} onCheckIn={checkIn} />}
        {tab === "history" && <HistoryLog visitors={history ?? []} loading={history === undefined} />}
        {tab === "stats" && <VisitorStats visitors={history ?? []} loading={history === undefined} />}
      </div>
    </div>
  );
}

function TodayLog({ visitors, onCheckIn, onCheckOut }: { visitors: any[]; onCheckIn: any; onCheckOut: any }) {
  if (visitors.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 space-y-2">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No visitors logged yet today</p>
        <p className="text-xs text-gray-600">Use the Walk-in tab to log a visitor,<br />or Scan Pass to check in a pre-registered guest.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {visitors.map(v => (
        <li key={v._id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{v.visitorName}</p>
            <p className="text-xs text-gray-400">{v.visitorPhone}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
              {v.checkedInAt && <span className="text-green-400">In {formatTime(v.checkedInAt)}</span>}
              {v.checkedOutAt && <span className="text-gray-400">Out {formatTime(v.checkedOutAt)}</span>}
              <span className="text-blue-300">Pass: {v.passCode}</span>
            </div>
          </div>
          <div className="shrink-0">
            {!v.checkedInAt && (
              <button
                onClick={() => onCheckIn({ visitorId: v._id }).then(() => toast.success("Checked in"))}
                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg"
              >
                <LogIn className="h-3.5 w-3.5" /> In
              </button>
            )}
            {v.checkedInAt && !v.checkedOutAt && (
              <button
                onClick={() => onCheckOut({ visitorId: v._id }).then(() => toast.success("Checked out"))}
                className="flex items-center gap-1 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg"
              >
                <LogOut className="h-3.5 w-3.5" /> Out
              </button>
            )}
            {v.checkedOutAt && (
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function HistoryLog({ visitors, loading }: { visitors: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }
  if (visitors.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No visitor history yet</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {visitors.map(v => (
        <li key={v._id} className="bg-gray-900 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{v.visitorName}</p>
            <p className="text-xs text-gray-400 truncate">{v.residentName ?? "—"} · Flat {v.flatNumber ?? "—"}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{formatDate(v.createdAt)}</p>
          </div>
          <div className="shrink-0 text-right">
            {v.checkedOutAt ? (
              <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Exited</span>
            ) : v.checkedInAt ? (
              <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">Inside</span>
            ) : (
              <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded-full">Expected</span>
            )}
            <p className="text-[10px] text-gray-600 mt-1">{v.passCode}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function WalkInForm({ societyId, onDone }: { societyId: any; onDone: () => void }) {
  const walkIn = useMutation(api.visitors.walkInEntry);
  const [form, setForm] = useState({ visitorName: "", visitorPhone: "", purposeFlat: "", vehicleNumber: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.visitorName || !form.visitorPhone || !form.purposeFlat) {
      toast.error("Name, phone, and flat are required");
      return;
    }
    setSaving(true);
    try {
      await walkIn({
        societyId,
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        purposeFlat: form.purposeFlat,
        vehicleNumber: form.vehicleNumber || undefined,
      });
      toast.success("Entry logged");
      setForm({ visitorName: "", visitorPhone: "", purposeFlat: "", vehicleNumber: "" });
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold flex items-center gap-2 text-sm">
        <UserPlus className="h-4 w-4 text-blue-400" /> Walk-in Entry
      </h2>
      {[
        { label: "Visitor Name *", key: "visitorName", placeholder: "Raju Kumar", type: "text" },
        { label: "Phone Number *", key: "visitorPhone", placeholder: "+91 98765 43210", type: "tel" },
        { label: "Visiting Flat *", key: "purposeFlat", placeholder: "A-204", type: "text" },
        { label: "Vehicle Number", key: "vehicleNumber", placeholder: "KA01AB1234 (optional)", type: "text" },
      ].map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-gray-300 text-xs">{f.label}</Label>
          <Input
            type={f.type}
            placeholder={f.placeholder}
            value={(form as any)[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 text-base"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-xs">Photo (optional)</Label>
        <label className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 cursor-pointer text-sm text-gray-400 hover:border-gray-600">
          <Camera className="h-4 w-4" />
          <span>Take photo</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" />
        </label>
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
        {saving ? "Logging…" : "Log Entry"}
      </Button>
    </div>
  );
}

function QrScanner({ onScan }: { onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const stoppedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    stoppedRef.current = false;
    setCameraError(null);
    let scanner: any;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("qr-scanner-region");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            const match = decodedText.match(/(\d{6})(?:[^0-9]|$)/);
            const code = match ? match[1] : decodedText.replace(/\D/g, "").slice(-6);
            scanner.stop().catch(() => {}).finally(() => onScanRef.current(code));
          },
          () => {}
        );
      } catch (err: any) {
        const msg = err?.message ?? "";
        if (msg.includes("permission") || msg.includes("NotAllowed")) {
          setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (msg.includes("NotFound") || msg.includes("Devices could not be found")) {
          setCameraError("No camera found on this device.");
        } else if (typeof window !== "undefined" && window.location.protocol !== "https:") {
          setCameraError("Camera requires HTTPS. Please access this page over a secure connection.");
        } else {
          setCameraError("Camera unavailable. Enter the pass code manually below.");
        }
      }
    }

    start();
    return () => {
      if (!stoppedRef.current && scanner) {
        stoppedRef.current = true;
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  if (cameraError) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-700 p-6 text-center space-y-3">
        <VideoOff className="h-8 w-8 text-gray-500 mx-auto" />
        <p className="text-sm text-gray-400">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "1" }}>
      <div id="qr-scanner-region" className="w-full h-full" />
    </div>
  );
}

function ScanPass({ societyId, onCheckIn }: { societyId: any; onCheckIn: any }) {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const lookup = useQuery(api.visitors.lookupByPassCode, code.length === 6 ? { societyId, passCode: code } : "skip");

  function handleScan(scanned: string) {
    setScanning(false);
    setCode(scanned.slice(0, 6));
  }

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold flex items-center gap-2 text-sm">
        <Search className="h-4 w-4 text-blue-400" /> Scan / Enter Pass Code
      </h2>

      {!scanning && (
        <button
          onClick={() => { setCode(""); setScanning(true); }}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-medium transition-colors"
        >
          <Camera className="h-4 w-4" /> Scan QR Code with Camera
        </button>
      )}

      {scanning && (
        <div className="space-y-2">
          <QrScanner onScan={handleScan} />
          <button
            onClick={() => setScanning(false)}
            className="w-full text-xs text-gray-400 hover:text-white py-2"
          >
            Cancel scan
          </button>
        </div>
      )}

      {!scanning && (
        <>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex-1 h-px bg-gray-800" />
            or enter manually
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="6-digit pass code"
            value={code}
            onChange={e => setCode(e.target.value.slice(0, 6))}
            className="bg-gray-800 border-gray-700 text-white text-2xl tracking-widest text-center placeholder:text-gray-600"
          />
        </>
      )}

      {code.length === 6 && !scanning && (
        <div className="bg-gray-900 rounded-xl p-4">
          {lookup === undefined && <p className="text-sm text-gray-400">Looking up…</p>}
          {lookup === null && <p className="text-sm text-red-400">No visitor found for this code.</p>}
          {lookup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="font-semibold text-green-300">Visitor found</span>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-400">Name:</span> {lookup.visitorName}</p>
                <p><span className="text-gray-400">Phone:</span> {lookup.visitorPhone}</p>
                <p><span className="text-gray-400">Visiting:</span> {lookup.flatNumber ?? "—"} ({lookup.residentName ?? "—"})</p>
                <p><span className="text-gray-400">Expected:</span> {formatTime(lookup.expectedAt)}</p>
                {lookup.checkedInAt && <Badge className="bg-green-900 text-green-300 text-[10px]">Already checked in</Badge>}
              </div>
              {!lookup.checkedInAt && (
                <button
                  onClick={() => {
                    onCheckIn({ visitorId: lookup._id });
                    toast.success(`${lookup.visitorName} checked in`);
                    setCode("");
                  }}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  <LogIn className="inline h-4 w-4 mr-1" /> Allow Entry
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisitorStats({ visitors, loading }: { visitors: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading stats…</span>
      </div>
    );
  }

  const today = new Date();
  const dayStats: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const label = i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" });
    const count = visitors.filter(v => v.createdAt >= dayStart && v.createdAt < dayEnd).length;
    dayStats.push({ label, count });
  }

  const checkedOut = visitors.filter(v => v.checkedOutAt).length;
  const avgDuration = checkedOut > 0
    ? Math.round(visitors.filter(v => v.checkedOutAt).reduce((s, v) => s + (v.checkedOutAt - v.checkedInAt) / 60000, 0) / checkedOut)
    : null;

  const purposeMap: Record<string, number> = {};
  visitors.forEach(v => {
    const key = v.purposeFlat ? `Flat ${v.purposeFlat}` : "—";
    purposeMap[key] = (purposeMap[key] ?? 0) + 1;
  });
  const topFlats = Object.entries(purposeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = Math.max(...dayStats.map(d => d.count), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total logged", value: visitors.length },
          { label: "Checked out", value: checkedOut },
          { label: "Avg visit (min)", value: avgDuration != null ? avgDuration : "—" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
          <BarChart2 className="h-3.5 w-3.5" /> Last 7 days
        </p>
        <div className="flex items-end gap-1.5 h-20">
          {dayStats.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-500">{d.count || ""}</span>
              <div
                className="w-full rounded-t-sm bg-blue-500/70"
                style={{ height: `${(d.count / maxCount) * 52}px`, minHeight: d.count > 0 ? 4 : 0 }}
              />
              <span className="text-[9px] text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {topFlats.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">Most visited flats</p>
          <ul className="space-y-2">
            {topFlats.map(([flat, count]) => (
              <li key={flat} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{flat}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-blue-500/50 rounded-full" style={{ width: `${(count / topFlats[0][1]) * 60}px` }} />
                  <span className="text-gray-500 text-xs w-4 text-right">{count}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function GuardPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-gray-950 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" /></div>}>
      <GuardPageInner />
    </Suspense>
  );
}
