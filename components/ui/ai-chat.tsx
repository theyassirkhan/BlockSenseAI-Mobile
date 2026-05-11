"use client";

import { useState, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "ai"; text: string; ts: number; }

const QUICK_QUESTIONS = [
  "What is my pending dues amount?",
  "What is the current water tank level?",
  "Any active alerts?",
  "When is garbage collection?",
];

interface AiChatProps {
  societyId: string;
  blockId: string;
  residentName: string;
  flatNumber: string;
  societyName: string;
}

export function AiChat({ societyId, blockId, residentName, flatNumber, societyName }: AiChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: `Hi ${residentName.split(" ")[0]}! I'm your BlockSense AI assistant. Ask me anything about your society — dues, water levels, alerts, or service requests.`, ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useAction(api.ai.residentChat);

  const dues = useQuery(api.payments.getMyDues, { societyId: societyId as any });
  const alerts = useQuery(api.alerts.getActiveAlerts, { societyId: societyId as any, blockId: blockId as any });
  const tanks = useQuery(api.water.getTankLevels, { societyId: societyId as any, blockId: blockId as any });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function buildContext() {
    const pendingDues = (dues ?? []).filter(d => d.status === "pending" || d.status === "overdue");
    const totalDue = pendingDues.reduce((s, d) => s + d.amount, 0);
    const tankInfo = (tanks ?? []).map(t => `${t.name}: ${t.currentLevelPct}%`).join(", ");
    const alertInfo = (alerts ?? []).slice(0, 3).map(a => `${a.severity} - ${a.title}`).join("; ");
    return [
      `Society: ${societyName}`,
      `Resident flat: ${flatNumber}`,
      `Pending dues: ₹${totalDue.toLocaleString("en-IN")} (${pendingDues.length} payments)`,
      `Water tanks: ${tankInfo || "No data"}`,
      `Active alerts: ${alertInfo || "None"}`,
    ].join("\n");
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg, ts: Date.now() }]);
    setLoading(true);
    try {
      const res = await chat({ message: msg, societyName, residentName, flatNumber, context: buildContext() });
      setMessages(prev => [...prev, { role: "ai", text: res.reply, ts: Date.now() }]);
    } catch (err) {
      const isConfig = err instanceof Error && err.message.includes("GOOGLE_AI_API_KEY");
      setMessages(prev => [...prev, {
        role: "ai",
        text: isConfig
          ? "AI assistant is not configured yet. Please contact your society admin."
          : "Sorry, something went wrong. Please try again in a moment.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-base"
        style={{ background: "linear-gradient(135deg, #0D9488, #0F766E)" }}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel — fixed, slides from right, never causes page overflow */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] max-w-full z-50 bg-card border-l border-border flex flex-col overflow-hidden shadow-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
                style={{ background: "rgba(13,148,136,0.08)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  <span className="font-semibold text-sm">BlockSense AI</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">Beta</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="Close chat">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-teal-600 text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}>
                      {m.role === "ai" && <Sparkles className="h-3 w-3 text-teal-400 inline mr-1 mb-0.5" />}
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
                      <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick questions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-full border border-border transition-colors duration-base"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 pt-2 shrink-0 border-t border-border">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <input
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none min-w-0"
                    placeholder="Ask anything…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={loading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="text-teal-400 hover:text-teal-300 disabled:opacity-30 transition-colors duration-base shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
