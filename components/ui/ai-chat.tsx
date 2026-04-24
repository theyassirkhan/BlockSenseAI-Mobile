"use client";

import { useState, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles, Send, X, MessageCircle, Loader2 } from "lucide-react";
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

  // Build live context from queries
  const dues = useQuery(api.payments.getMyDues, { societyId: societyId as any });
  const alerts = useQuery(api.alerts.getActiveAlerts, { societyId: societyId as any, blockId: blockId as any });
  const tanks = useQuery(api.water.getTankLevels, { societyId: societyId as any, blockId: blockId as any });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const res = await chat({
        message: msg,
        societyName,
        residentName,
        flatNumber,
        context: buildContext(),
      });
      setMessages(prev => [...prev, { role: "ai", text: res.reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Please try again.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm bg-gray-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "min(560px, calc(100vh - 100px))" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/60 to-blue-900/60 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-300" />
                <span className="font-semibold text-sm text-white">BlockSense AI</span>
                <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">Beta</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  )}>
                    {m.role === "ai" && <Sparkles className="h-3 w-3 text-purple-400 inline mr-1 mb-0.5" />}
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
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
                    className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/5">
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                <input
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                  placeholder="Ask anything…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
