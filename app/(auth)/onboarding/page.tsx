"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Building2, Users, Home, Shield, ShieldCheck,
  ChevronRight, ChevronLeft, Loader2, Check, Search,
  MapPin, Hash, Phone,
} from "lucide-react";

type Role = "admin" | "rwa" | "resident" | "guard";
type Intent = "create" | "join";

interface StepProps { onNext: (data: any) => void; onBack?: () => void; loading?: boolean }

const ROLES: { value: Role; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "admin",    label: "Society Admin",  desc: "Create and manage a society",        icon: ShieldCheck, color: "#A855F7", bg: "rgba(168,85,247,0.1)" },
  { value: "rwa",      label: "RWA Manager",    desc: "Oversee operations and approvals",   icon: Users,       color: "#38BDF8", bg: "rgba(56,189,248,0.1)" },
  { value: "resident", label: "Resident",       desc: "Track utilities, raise complaints",  icon: Home,        color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  { value: "guard",    label: "Security Guard", desc: "Manage gate and visitor log",        icon: Shield,      color: "#F97316", bg: "rgba(249,115,22,0.1)" },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-all duration-500"
          style={{ background: i < step ? "#A855F7" : "rgba(255,255,255,0.1)" }}
        />
      ))}
    </div>
  );
}

function NavButton({ onClick, disabled, variant = "primary", children }: {
  onClick?: () => void; disabled?: boolean; variant?: "primary" | "ghost"; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
      style={variant === "primary"
        ? { background: "linear-gradient(90deg,#A855F7,#7C3AED)", color: "#fff" }
        : { background: "rgba(255,255,255,0.06)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }
      }
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Collected data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [societyId, setSocietyId] = useState<Id<"societies"> | null>(null);
  const [blockId, setBlockId] = useState<Id<"blocks"> | null>(null);
  const [flatNumber, setFlatNumber] = useState("");

  // Pre-fill from invite
  useEffect(() => {
    const raw = sessionStorage.getItem("inviteData");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.role) setRole(data.role as Role);
      if (data.flatNumber) setFlatNumber(data.flatNumber);
      if (data.societyId) { setSocietyId(data.societyId); setIntent("join"); }
      if (data.blockId) setBlockId(data.blockId);
    } catch {}
  }, []);

  const createProfile   = useMutation(api.users.createProfile);
  const createSociety   = useMutation(api.societies.create);
  const addBlock        = useMutation(api.societies.addBlock);
  const setActiveSociety = useMutation(api.users.setActiveSociety);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const consumeInvite = useMutation((api as any).invites.consume);

  // Society create form state
  const [socName, setSocName] = useState("");
  const [socCity, setSocCity] = useState("Bangalore");
  const [socAddress, setSocAddress] = useState("");
  const [blockName, setBlockName] = useState("Block A");

  // Society join search
  const societies = useQuery(api.societies.listAll);
  const [search, setSearch] = useState("");

  // Blocks for join flow
  const blocks = useQuery(
    api.societies.getBlocks,
    societyId ? { societyId } : "skip"
  );

  const totalSteps = role === "admin" ? 4 : role ? 4 : 3;

  async function handleFinish() {
    if (!role) return;
    setLoading(true);
    try {
      // 1. Create profile
      await createProfile({
        name,
        role,
        societyId: societyId ?? undefined,
        blockId: blockId ?? undefined,
        flatNumber: flatNumber || undefined,
        phone: phone || undefined,
      });

      // 2. If admin created a new society, set as active
      if (role === "admin" && societyId) {
        await setActiveSociety({ societyId });
      }

      // 3. Complete onboarding
      await completeOnboarding({
        whatsapp: phone,
        whatsappVerified: false,
        societyId: societyId ?? undefined,
        blockId: blockId ?? undefined,
      });

      // Consume invite token if present
      const inviteToken = sessionStorage.getItem("inviteToken");
      if (inviteToken) {
        try { await consumeInvite({ token: inviteToken }); } catch {}
        sessionStorage.removeItem("inviteToken");
        sessionStorage.removeItem("inviteData");
      }

      toast.success("Welcome to BlockSense!");

      if (role === "admin") router.replace("/admin");
      else if (role === "resident") router.replace("/resident");
      else if (role === "guard") router.replace("/guard");
      else router.replace("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSociety() {
    if (!socName.trim() || !socCity.trim()) return;
    setLoading(true);
    try {
      const id = await createSociety({ name: socName, city: socCity, address: socAddress || undefined });
      const bId = await addBlock({ societyId: id, name: blockName, type: "block" });
      setSocietyId(id);
      setBlockId(bId);
      setStep(s => s + 1);
    } catch {
      toast.error("Failed to create society");
    } finally {
      setLoading(false);
    }
  }

  // Slide animation variants
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };
  const [dir, setDir] = useState(1);
  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }

  const filteredSocieties = (societies ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050508" }}>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full -top-20 -left-20 opacity-20"
          style={{ background: "radial-gradient(circle,#A855F7,transparent)", filter: "blur(80px)" }} />
        <div className="absolute w-80 h-80 rounded-full bottom-0 right-0 opacity-10"
          style={{ background: "radial-gradient(circle,#38BDF8,transparent)", filter: "blur(80px)" }} />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)", boxShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
            <span className="text-white font-bold text-xs">BS</span>
          </div>
          <span className="font-bold text-white text-lg">BlockSense</span>
        </div>

        {/* Progress */}
        <ProgressBar step={step} total={totalSteps} />

        {/* Card */}
        <div className="rounded-2xl p-6 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >

              {/* ── Step 0: Name + Phone ── */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Welcome! 👋</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717A" }}>Let's get your profile set up.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Full name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Phone number <span style={{ color: "#52525B" }}>(optional)</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
                        <input
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                      </div>
                    </div>
                  </div>

                  <NavButton onClick={goNext} disabled={!name.trim()}>
                    Continue <ChevronRight className="h-4 w-4" />
                  </NavButton>
                </div>
              )}

              {/* ── Step 1: Role ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">What's your role?</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717A" }}>This determines what you can see and do.</p>
                  </div>

                  <div className="space-y-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setRole(r.value)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left"
                        style={{
                          background: role === r.value ? r.bg : "rgba(255,255,255,0.02)",
                          border: `1px solid ${role === r.value ? r.color + "60" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: role === r.value ? `0 0 20px ${r.color}20` : "none",
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: r.bg }}>
                          <r.icon className="h-5 w-5" style={{ color: r.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{r.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#71717A" }}>{r.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            background: role === r.value ? r.color : "transparent",
                            border: `2px solid ${role === r.value ? r.color : "rgba(255,255,255,0.2)"}`,
                          }}>
                          {role === r.value && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <NavButton variant="ghost" onClick={goBack}><ChevronLeft className="h-4 w-4" /> Back</NavButton>
                    <NavButton onClick={goNext} disabled={!role}>
                      Continue <ChevronRight className="h-4 w-4" />
                    </NavButton>
                  </div>
                </div>
              )}

              {/* ── Step 2: Intent (create or join) ── */}
              {step === 2 && role !== "admin" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Your society</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717A" }}>Are you creating a new one or joining an existing society?</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { value: "join" as Intent, label: "Join existing society", desc: "Search for your society by name", icon: Search, color: "#38BDF8" },
                      { value: "create" as Intent, label: "Create new society", desc: "Set up a society for your community", icon: Building2, color: "#A855F7" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setIntent(opt.value)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left"
                        style={{
                          background: intent === opt.value ? `${opt.color}15` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${intent === opt.value ? opt.color + "50" : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${opt.color}18` }}>
                          <opt.icon className="h-5 w-5" style={{ color: opt.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#71717A" }}>{opt.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            background: intent === opt.value ? opt.color : "transparent",
                            border: `2px solid ${intent === opt.value ? opt.color : "rgba(255,255,255,0.2)"}`,
                          }}>
                          {intent === opt.value && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Join: society search */}
                  {intent === "join" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search society name or city…"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "rgba(56,189,248,0.7)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {filteredSocieties.length === 0 && (
                          <p className="text-xs text-center py-4" style={{ color: "#52525B" }}>No societies found</p>
                        )}
                        {filteredSocieties.map(s => (
                          <button
                            key={s._id}
                            onClick={() => setSocietyId(s._id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                            style={{
                              background: societyId === s._id ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${societyId === s._id ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.06)"}`,
                            }}
                          >
                            <Building2 className="h-4 w-4 shrink-0" style={{ color: "#38BDF8" }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{s.name}</p>
                              <p className="text-xs" style={{ color: "#71717A" }}>{s.city}</p>
                            </div>
                            {societyId === s._id && <Check className="h-4 w-4 shrink-0" style={{ color: "#38BDF8" }} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Create: basic society form */}
                  {intent === "create" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <input value={socName} onChange={e => setSocName(e.target.value)} placeholder="Society name *"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
                      <input value={socCity} onChange={e => setSocCity(e.target.value)} placeholder="City *"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <NavButton variant="ghost" onClick={goBack}><ChevronLeft className="h-4 w-4" /> Back</NavButton>
                    {intent === "join" && (
                      <NavButton onClick={goNext} disabled={!societyId}>
                        Continue <ChevronRight className="h-4 w-4" />
                      </NavButton>
                    )}
                    {intent === "create" && (
                      <NavButton onClick={async () => { await handleCreateSociety(); }} disabled={loading || !socName.trim() || !socCity.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create <ChevronRight className="h-4 w-4" /></>}
                      </NavButton>
                    )}
                    {!intent && <NavButton disabled>Continue <ChevronRight className="h-4 w-4" /></NavButton>}
                  </div>
                </div>
              )}

              {/* ── Step 2 (admin): Create society ── */}
              {step === 2 && role === "admin" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Create your society</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717A" }}>You can add more details from the admin panel later.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { value: socName, setter: setSocName, placeholder: "Society name *", icon: Building2 },
                      { value: socCity, setter: setSocCity, placeholder: "City *", icon: MapPin },
                      { value: socAddress, setter: setSocAddress, placeholder: "Address (optional)", icon: MapPin },
                      { value: blockName, setter: setBlockName, placeholder: "First block name *", icon: Hash },
                    ].map(({ value, setter, placeholder, icon: Icon }) => (
                      <div key={placeholder} className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
                        <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")} />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <NavButton variant="ghost" onClick={goBack}><ChevronLeft className="h-4 w-4" /> Back</NavButton>
                    <NavButton
                      onClick={handleCreateSociety}
                      disabled={loading || !socName.trim() || !socCity.trim() || !blockName.trim()}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ChevronRight className="h-4 w-4" /></>}
                    </NavButton>
                  </div>
                </div>
              )}

              {/* ── Step 3: Flat / block details (resident/guard/rwa) ── */}
              {step === 3 && role !== "admin" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Your unit details</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717A" }}>Help us place you in the right block and flat.</p>
                  </div>

                  <div className="space-y-3">
                    {/* Block selector */}
                    {societyId && blocks && blocks.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Block / Wing</label>
                        <div className="flex flex-wrap gap-2">
                          {blocks.map(b => (
                            <button
                              key={b._id}
                              onClick={() => setBlockId(b._id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                background: blockId === b._id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${blockId === b._id ? "rgba(168,85,247,0.6)" : "rgba(255,255,255,0.08)"}`,
                                color: blockId === b._id ? "#C084FC" : "#A1A1AA",
                              }}
                            >
                              {b.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {role === "resident" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Flat / Unit number</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
                          <input
                            value={flatNumber}
                            onChange={e => setFlatNumber(e.target.value)}
                            placeholder="e.g. A-204"
                            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <NavButton variant="ghost" onClick={goBack}><ChevronLeft className="h-4 w-4" /> Back</NavButton>
                    <NavButton onClick={handleFinish} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup ✓"}
                    </NavButton>
                  </div>
                </div>
              )}

              {/* ── Step 3 (admin): Finish ── */}
              {step === 3 && role === "admin" && (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)", boxShadow: "0 0 40px rgba(168,85,247,0.4)" }}
                    >
                      <Check className="h-8 w-8 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white">You're all set!</h1>
                    <p className="text-sm mt-2" style={{ color: "#71717A" }}>
                      Society created. You'll be taken to your admin dashboard where you can add residents, configure utilities, and more.
                    </p>
                  </div>

                  <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    {[
                      ["Name", name],
                      ["Role", "Society Admin"],
                      ["Society", socName],
                      ["City", socCity],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span style={{ color: "#71717A" }}>{label}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <NavButton onClick={handleFinish} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go to dashboard →"}
                  </NavButton>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs mt-4" style={{ color: "#3F3F46" }}>
          Step {step + 1} of {totalSteps}
        </p>
      </motion.div>
    </div>
  );
}
