"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Users, Home } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});
type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

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
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  // Clear stale auth on mount
  useEffect(() => {
    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth:signOut", args: {} }),
    }).catch(() => {});
  }, []);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  async function onEmailSubmit({ email }: EmailForm) {
    setLoading(true);
    try {
      const data = await callAuth({ provider: "resend-otp", params: { email: email.toLowerCase().trim() } });
      if (data.started) {
        setEmail(email.toLowerCase().trim());
        setStep("otp");
        toast.success("Code sent — check your inbox");
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit({ code }: OtpForm) {
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
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(role: "admin" | "rwa" | "resident") {
    setDemoLoading(role);
    try {
      const data = await callAuth({ provider: "anonymous" });
      if (data.tokens) {
        const dest = role === "resident" ? `/resident?setup=${role}` : `/dashboard?setup=${role}`;
        window.location.href = dest;
      } else {
        throw new Error("Demo login failed");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Demo login failed");
      setDemoLoading(null);
    }
  }

  const demoRoles = [
    { role: "admin" as const, label: "Admin", desc: "Full access", icon: ShieldCheck, color: "#0F6E56" },
    { role: "rwa" as const, label: "RWA Manager", desc: "Manage & approve", icon: Users, color: "#185FA5" },
    { role: "resident" as const, label: "Resident", desc: "View & report", icon: Home, color: "#854F0B" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <span className="text-white font-bold text-xl">BS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">BlockSense</h1>
          <p className="text-sm text-muted-foreground mt-1">Smart Community Operating System</p>
        </div>

        {/* Demo Buttons */}
        <div className="rounded-lg border border-dashed border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-500/30 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3 text-center uppercase tracking-wide">
            ⚡ Demo Access — No login required
          </p>
          <div className="grid grid-cols-3 gap-2">
            {demoRoles.map(({ role, label, desc, icon: Icon, color }) => (
              <button
                key={role}
                onClick={() => demoLogin(role)}
                disabled={demoLoading !== null}
                className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: `${color}40` }}
              >
                {demoLoading === role ? (
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color }} />
                ) : (
                  <Icon className="h-5 w-5" style={{ color }} />
                )}
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or sign in with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email / OTP Card */}
        <div className="bg-card rounded-lg border p-6 shadow-sm" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          {step === "email" ? (
            <>
              <h2 className="text-base font-semibold mb-1">Sign in</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Enter your email to receive a one-time code.
              </p>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoFocus
                    {...emailForm.register("email")}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send code
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold mb-1">Enter your code</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Sent to <span className="font-medium text-foreground">{email}</span>
              </p>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    className="text-center text-2xl tracking-widest font-mono"
                    {...otpForm.register("code")}
                  />
                  {otpForm.formState.errors.code && (
                    <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("email"); otpForm.reset(); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secure sign-in for verified community members only.
        </p>
      </div>
    </div>
  );
}
