"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Users, Home } from "lucide-react";

const DEMO_ROLES = [
  { role: "admin" as const, label: "Admin", desc: "Full access", icon: ShieldCheck, color: "#A855F7" },
  { role: "rwa" as const, label: "RWA Manager", desc: "Manage & approve", icon: Users, color: "#38BDF8" },
  { role: "resident" as const, label: "Resident", desc: "View & report", icon: Home, color: "#34D399" },
];

async function callAuth(args: Record<string, unknown>) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auth:signIn", args }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth:signOut", args: {} }),
    }).catch(() => {});
  }, []);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    try {
      const data = await callAuth({ provider: "resend-otp", params: { email: emailInput.toLowerCase().trim() } });
      if (data.started) {
        setEmail(emailInput.toLowerCase().trim());
        setStep("otp");
        toast.success("Code sent — check your inbox");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        throw new Error("Unexpected response");
      }
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
      const data = await callAuth({ provider: "resend-otp", params: { email, code } });
      if (data.tokens) {
        window.location.href = "/dashboard";
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
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  async function demoLogin(role: "admin" | "rwa" | "resident") {
    setDemoLoading(role);
    try {
      const data = await callAuth({ provider: "anonymous" });
      if (data.tokens) {
        window.location.href = `/?setup=${role}`;
      } else {
        throw new Error("Demo login failed");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Demo login failed");
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0A0A" }}>
      {/* Left panel — form */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #16161A 50%, #0F0F14 100%)" }}
      >
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)" }}
            >
              <span className="text-white text-sm font-bold">BS</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">BlockSenseAI</span>
          </div>

          {step === "email" ? (
            <>
              <div>
                <h1 className="text-3xl font-bold text-white">Sign in</h1>
                <p className="text-sm mt-1" style={{ color: "#71717A" }}>
                  Enter your email to receive a one-time code.
                </p>
              </div>

              <form onSubmit={onEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@society.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50"
                    style={{ background: "#16161A", border: "1px solid #27272A" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 btn-primary-glow transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #A855F7 0%, #9333EA 100%)" }}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send code
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "#27272A" }} />
                <span className="text-xs font-mono tracking-widest" style={{ color: "#52525B" }}>OR DEMO ACCESS</span>
                <div className="h-px flex-1" style={{ background: "#27272A" }} />
              </div>

              {/* Demo buttons */}
              <div className="space-y-2">
                {DEMO_ROLES.map(({ role, label, desc, icon: Icon, color }) => (
                  <button
                    key={role}
                    onClick={() => demoLogin(role)}
                    disabled={demoLoading !== null}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
                    style={{ background: "transparent", border: "1px solid #27272A" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = color + "60")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272A")}
                  >
                    {demoLoading === role
                      ? <Loader2 className="h-4 w-4 animate-spin" style={{ color }} />
                      : <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                    }
                    <span className="text-white font-medium">{label}</span>
                    <span className="text-xs ml-auto" style={{ color: "#52525B" }}>{desc}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-3xl font-bold text-white">Enter your code</h1>
                <p className="text-sm mt-1" style={{ color: "#71717A" }}>
                  Sent to <span style={{ color: "#A1A1AA" }}>{email}</span>
                </p>
              </div>

              <form onSubmit={onOtpSubmit} className="space-y-5">
                <div className="flex gap-2.5" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="flex-1 h-14 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
                      style={{
                        background: digit ? "#A855F720" : "#111113",
                        border: digit ? "2px solid #A855F7" : "1px solid #27272A",
                        caretColor: "#A855F7",
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.some(d => !d)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 btn-primary-glow transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #A855F7 0%, #9333EA 100%)" }}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </button>

                <p className="text-xs text-center" style={{ color: "#52525B" }}>
                  Didn&apos;t receive a code?{" "}
                  <button
                    type="button"
                    onClick={() => onEmailSubmit({ preventDefault: () => {} } as React.FormEvent)}
                    className="underline transition-colors"
                    style={{ color: "#71717A" }}
                  >
                    Resend
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }}
                  className="w-full text-xs text-center transition-colors"
                  style={{ color: "#52525B" }}
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs" style={{ color: "#3F3F46" }}>
            Secure sign-in for verified community members only.
          </p>
        </div>
      </div>

      {/* Right panel — decorative (hidden on mobile screens) */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-[480px] xl:w-[560px] relative overflow-hidden"
        style={{ background: "#111113" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: "#A855F7" }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ background: "#6366F1" }} />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl opacity-15" style={{ background: "#34D399" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-10 px-12 text-center">
          <div className="flex flex-col items-center gap-4" style={{ color: "#A855F7" }}>
            <span className="text-4xl font-light opacity-60">+</span>
            <span className="text-4xl font-light opacity-40">+</span>
            <span className="text-4xl font-light opacity-20">+</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white leading-tight">
              The Smart Community<br />Operating System
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#71717A" }}>
              Monitor utilities, manage residents, predict resource needs — all in real-time.
            </p>
          </div>

          <div className="flex gap-6 text-xs" style={{ color: "#52525B" }}>
            {["Real-time sync", "AI predictions", "End-to-end alerts"].map(f => (
              <div key={f} className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full" style={{ background: "#A855F7" }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
