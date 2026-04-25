"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Users, Home, Zap, BarChart3, Shield, ShieldAlert } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

const DEMO_ROLES = [
  { role: "admin" as const,    label: "Admin",          desc: "Full platform access", icon: ShieldCheck,  color: "#A855F7", glow: "rgba(168,85,247,0.25)" },
  { role: "rwa" as const,      label: "RWA Manager",    desc: "Manage & approve",     icon: Users,        color: "#38BDF8", glow: "rgba(56,189,248,0.25)" },
  { role: "resident" as const, label: "Resident",       desc: "View & report",        icon: Home,         color: "#34D399", glow: "rgba(52,211,153,0.25)" },
  { role: "guard" as const,    label: "Security Guard", desc: "Gate & visitor log",   icon: ShieldAlert,  color: "#F97316", glow: "rgba(249,115,22,0.25)" },
];

const FEATURES = [
  { icon: Zap, label: "Real-time sync", color: "#A855F7" },
  { icon: BarChart3, label: "AI predictions", color: "#38BDF8" },
  { icon: Shield, label: "End-to-end alerts", color: "#34D399" },
];

/* Floating ambient orb */
function Orb({ style, animateVals }: { style: React.CSSProperties; animateVals: Record<string, number[]> }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ filter: "blur(80px)", ...style }}
      animate={animateVals}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* Perspective grid */
function Grid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ perspective: "600px" }}>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          transformOrigin: "50% 0%",
          rotateX: "55deg",
          translateY: "-5%",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "0px 56px"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* 3D tilt card */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function LoginPageInner() {
  const { signIn, signOut } = useAuthActions();
  const sendOTP = useAction(api.otp.sendOTP);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const searchParams = useSearchParams();
  const autoDemo = searchParams.get("demo") as "admin" | "rwa" | "resident" | "guard" | null;
  const autoDemoTriggered = useRef(false);

  useEffect(() => {
    signOut().catch(() => {}).finally(() => {
      if (autoDemo && !autoDemoTriggered.current) {
        autoDemoTriggered.current = true;
        demoLogin(autoDemo);
      }
    });
  }, []);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    try {
      const normalised = emailInput.toLowerCase().trim();
      await sendOTP({ email: normalised });
      setEmail(normalised);
      setStep("otp");
      toast.success("Code sent — check your inbox");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await signIn("otp", { email, code });
      if (result.signingIn) {
        window.location.href = "/";
      } else {
        throw new Error("Invalid or expired code.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every(d => d) && digit) {
      setTimeout(() => {
        const form = inputRefs.current[0]?.closest("form");
        form?.requestSubmit();
      }, 50);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) { setOtp(text.split("")); inputRefs.current[5]?.focus(); }
  }

  async function demoLogin(role: "admin" | "rwa" | "resident" | "guard") {
    setDemoLoading(role);
    try {
      const result = await signIn("anonymous");
      if (result.signingIn) {
        sessionStorage.setItem("demoRole", role);
        window.location.href = `/onboarding`;
      } else {
        throw new Error("Demo login failed");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Demo login failed");
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#050508" }}>

      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Orb style={{ width: 500, height: 500, top: "-10%", left: "-5%", background: "rgba(168,85,247,0.15)" }} animateVals={{ x: [0, 40, 0], y: [0, -30, 0] }} />
        <Orb style={{ width: 400, height: 400, bottom: "0%", right: "30%", background: "rgba(99,102,241,0.1)" }} animateVals={{ x: [0, -30, 0], y: [0, 20, 0] }} />
        <Orb style={{ width: 300, height: 300, top: "30%", right: "5%", background: "rgba(56,189,248,0.07)" }} animateVals={{ x: [0, 20, 0], y: [0, -40, 0] }} />
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }} />
      </div>

      {/* ── Left panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <Grid />

        <motion.div
          className="w-full max-w-sm space-y-7 relative"
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo */}
          <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <motion.div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)", boxShadow: "0 0 24px rgba(168,85,247,0.6)" }}
              animate={{ boxShadow: ["0 0 24px rgba(168,85,247,0.4)", "0 0 40px rgba(168,85,247,0.7)", "0 0 24px rgba(168,85,247,0.4)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              whileHover={{ scale: 1.1, rotate: 6 }}
            >
              <span className="text-white font-bold text-sm">BS</span>
            </motion.div>
            <span className="font-bold text-xl tracking-tight text-white">BlockSenseAI</span>
          </motion.div>

          {/* Form steps */}
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Sign in</h1>
                  <p className="text-sm mt-1.5" style={{ color: "#71717A" }}>Enter your email to receive a one-time code.</p>
                </div>

                <TiltCard>
                  <form onSubmit={onEmailSubmit} className="space-y-4 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Email</label>
                      <input
                        type="email"
                        placeholder="you@society.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        autoFocus
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                    </div>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 overflow-hidden relative"
                      style={{ background: "linear-gradient(90deg, #A855F7, #7C3AED)" }}
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(168,85,247,0.55)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                    </motion.button>
                  </form>
                </TiltCard>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <span className="text-[11px] font-mono tracking-widest" style={{ color: "#3F3F46" }}>OR DEMO ACCESS</span>
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                </div>

                {/* Demo buttons */}
                <div className="space-y-2">
                  {DEMO_ROLES.map(({ role, label, desc, icon: Icon, color, glow }, i) => (
                    <motion.button
                      key={role}
                      onClick={() => demoLogin(role)}
                      disabled={demoLoading !== null}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm disabled:opacity-50 relative overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i + 0.2 }}
                      whileHover={{ x: 4, borderColor: color + "55", backgroundColor: color + "0d", boxShadow: `0 0 20px ${glow}` }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {demoLoading === role
                        ? <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color }} />
                        : <Icon className="h-4 w-4 shrink-0" style={{ color }} />}
                      <span className="text-white font-medium">{label}</span>
                      <span className="text-xs ml-auto" style={{ color: "#52525B" }}>{desc}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Enter your code</h1>
                  <p className="text-sm mt-1.5" style={{ color: "#71717A" }}>Sent to <span style={{ color: "#A1A1AA" }}>{email}</span></p>
                </div>

                <TiltCard>
                  <form onSubmit={onOtpSubmit} className="space-y-5 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}>
                    <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <motion.input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          className="w-10 h-12 text-center text-xl font-bold text-white rounded-xl outline-none transition-all duration-150 shrink-0"
                          style={{
                            background: digit ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.04)",
                            border: digit ? "2px solid #A855F7" : "1px solid rgba(255,255,255,0.1)",
                            boxShadow: digit ? "0 0 16px rgba(168,85,247,0.35)" : "none",
                            caretColor: "#A855F7",
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        />
                      ))}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading || otp.some(d => !d)}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "linear-gradient(90deg, #A855F7, #7C3AED)" }}
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(168,85,247,0.55)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                    </motion.button>

                    <p className="text-xs text-center" style={{ color: "#52525B" }}>
                      Didn&apos;t receive a code?{" "}
                      <button type="button" onClick={() => onEmailSubmit({ preventDefault: () => {} } as React.FormEvent)} className="underline hover:text-zinc-400 transition-colors" style={{ color: "#71717A" }}>
                        Resend
                      </button>
                    </p>
                    <button type="button" onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }} className="w-full text-xs text-center hover:text-zinc-400 transition-colors" style={{ color: "#52525B" }}>
                      Use a different email
                    </button>
                  </form>
                </TiltCard>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p className="text-center text-xs" style={{ color: "#3F3F46" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Secure sign-in for verified community members only.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Right panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center w-[480px] xl:w-[560px] relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(168,85,247,0.4), transparent)" }} />
        <Orb style={{ width: 350, height: 350, top: "10%", right: "10%", background: "rgba(168,85,247,0.1)" }} animateVals={{ scale: [1, 1.1, 1] }} />

        <div className="relative z-10 flex flex-col items-center gap-10 px-12 text-center">

          {/* Floating 3D badge */}
          <motion.div className="relative" animate={{ y: [0, -14, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div
              className="w-28 h-28 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 60px rgba(168,85,247,0.2), inset 0 0 40px rgba(168,85,247,0.05)" }}
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-4xl font-black" style={{ background: "linear-gradient(135deg, #A855F7, #38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BS</span>
            </motion.div>
            {/* Orbiting dot */}
            <motion.div className="absolute w-3 h-3 rounded-full" style={{ background: "#A855F7", boxShadow: "0 0 12px #A855F7", top: -4, right: -4 }} animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            {/* Pulse ring */}
            <motion.div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid rgba(168,85,247,0.3)" }} animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2.5, repeat: Infinity }} />
          </motion.div>

          <div className="space-y-3">
            <motion.h2 className="text-4xl font-bold text-white leading-tight" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              The Smart Community<br />
              <span style={{ background: "linear-gradient(90deg, #A855F7, #38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Operating System</span>
            </motion.h2>
            <motion.p className="text-sm leading-relaxed" style={{ color: "#71717A" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Monitor utilities, manage residents, predict resource needs — all in real-time.
            </motion.p>
          </div>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 w-full">
            {FEATURES.map(({ icon: Icon, label, color }, i) => (
              <motion.div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ x: -4, borderColor: color + "40", backgroundColor: color + "0a" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
                <motion.div className="ml-auto w-2 h-2 rounded-full" style={{ background: color }} animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div className="flex gap-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            {[["500+", "Societies"], ["50K+", "Residents"], ["99.9%", "Uptime"]].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-xl font-bold" style={{ background: "linear-gradient(135deg, #A855F7, #38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                <div className="text-xs mt-0.5" style={{ color: "#52525B" }}>{lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() { return <Suspense><LoginPageInner /></Suspense>; }
