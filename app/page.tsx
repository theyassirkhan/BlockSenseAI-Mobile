"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Droplets, Zap, Bell, Shield, Users, BarChart3,
  ChevronRight, Building2, Star, Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: Droplets, color: "#38BDF8", title: "Utility Monitoring", desc: "Real-time water, power, gas & sewage levels with predictive alerts." },
  { icon: Bell, color: "#A855F7", title: "Smart Notifications", desc: "Instant in-app and WhatsApp alerts for residents, guards, and RWA." },
  { icon: Shield, color: "#F97316", title: "Gate Management", desc: "Digital visitor log, pre-registration, and guard duty tracking." },
  { icon: Users, color: "#34D399", title: "Resident Portal", desc: "Dues, service requests, notices, and AI assistant — all in one place." },
  { icon: BarChart3, color: "#F59E0B", title: "Payment Analytics", desc: "Track monthly collections, overdue trends, and revenue charts." },
  { icon: Sparkles, color: "#EC4899", title: "AI Assistant", desc: "Ask BlockSense AI anything about your society — dues, tanks, alerts." },
];

const DEMO_ROLES = [
  { label: "Admin", param: "admin", color: "#A855F7", desc: "Manage society, users & analytics" },
  { label: "RWA Manager", param: "rwa", color: "#38BDF8", desc: "Oversee operations & approvals" },
  { label: "Resident", param: "resident", color: "#34D399", desc: "Utilities, dues & requests" },
  { label: "Guard", param: "guard", color: "#F97316", desc: "Gate log & visitor passes" },
];

function RootRedirect() {
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setup = searchParams.get("setup");

  useEffect(() => {
    if (setup) {
      if (setup === "admin") router.replace(`/admin?setup=admin`);
      else if (setup === "resident") router.replace(`/resident?setup=resident`);
      else if (setup === "guard") router.replace(`/guard?setup=guard`);
      else router.replace(`/dashboard?setup=${setup}`);
      return;
    }
    if (profile === undefined) return;
    if (profile === null || !profile.onboardingComplete) return; // stay on landing
    if (profile.role === "platform_admin" || profile.role === "admin") router.replace("/admin");
    else if (profile.role === "resident") router.replace("/resident");
    else if (profile.role === "guard") router.replace("/guard");
    else router.replace("/dashboard");
  }, [profile, setup]);

  return null;
}

export default function LandingPage() {
  const [hoveredDemo, setHoveredDemo] = useState<string | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "#050508", color: "#fff" }}>
      <Suspense><RootRedirect /></Suspense>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full -top-40 -left-40 opacity-10"
          style={{ background: "radial-gradient(circle,#A855F7,transparent)", filter: "blur(100px)" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full top-1/2 right-0 opacity-8"
          style={{ background: "radial-gradient(circle,#38BDF8,transparent)", filter: "blur(100px)" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bottom-0 left-1/3 opacity-6"
          style={{ background: "radial-gradient(circle,#34D399,transparent)", filter: "blur(120px)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }}>
            <span className="text-white font-bold text-xs">BS</span>
          </div>
          <span className="font-bold text-white text-lg">BlockSense</span>
        </div>
        <Link href="/login"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(90deg,#A855F7,#7C3AED)" }}>
          Sign in <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#C084FC" }}>
            <Sparkles className="h-3 w-3" /> AI-powered society management
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6"
            style={{ background: "linear-gradient(135deg,#fff 40%,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Your society,<br />intelligently managed
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
            BlockSense gives RWAs, residents, and guards a unified platform to monitor utilities, track payments, manage visitors, and stay connected — with AI built in.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: "linear-gradient(90deg,#A855F7,#7C3AED)", boxShadow: "0 0 30px rgba(168,85,247,0.3)" }}>
              Get started free <ChevronRight className="h-4 w-4" />
            </Link>
            <a href="#demo"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Try demo →
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" className="relative z-10 px-6 pb-24 max-w-4xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-12 text-center"
          style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <Building2 className="h-10 w-10 mx-auto mb-4" style={{ color: "#A855F7" }} />
          <h2 className="text-3xl font-bold text-white mb-3">Try the live demo</h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            No sign-up needed. Pick a role and explore with realistic demo data.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_ROLES.map(({ label, param, color, desc }) => (
              <Link
                key={param}
                href={`/login?demo=${param}`}
                onMouseEnter={() => setHoveredDemo(param)}
                onMouseLeave={() => setHoveredDemo(null)}
                className="p-4 rounded-xl text-left transition-all duration-200 block"
                style={{
                  background: hoveredDemo === param ? `${color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hoveredDemo === param ? color + "50" : "rgba(255,255,255,0.08)"}`,
                  transform: hoveredDemo === param ? "translateY(-2px)" : "none",
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${color}20` }}>
                  <span className="text-xs font-bold" style={{ color }}>{label[0]}</span>
                </div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          © 2025 BlockSense · Built for Indian housing societies
        </p>
      </footer>
    </div>
  );
}
