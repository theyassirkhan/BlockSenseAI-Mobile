"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveBlock } from "@/hooks/use-active-block";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, Loader2, Sparkles, Droplets, Zap, Flame, Wind, Trash2, FileText } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { toast } from "sonner";
import { motion } from "framer-motion";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const UTILITY_CARDS = [
  { key: "water", label: "Water", icon: Droplets, color: "#38BDF8" },
  { key: "power", label: "Power", icon: Zap, color: "#F59E0B" },
  { key: "gas", label: "Gas", icon: Flame, color: "#34D399" },
  { key: "sewage", label: "Sewage / STP", icon: Wind, color: "#F97316" },
  { key: "waste", label: "Solid Waste", icon: Trash2, color: "#E879A0" },
];

function ReportRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-xs font-semibold ${highlight ? "text-purple-300" : "text-white"}`}>{value}</dd>
    </div>
  );
}

export default function ReportsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const { blockId } = useActiveBlock(profile?.defaultBlockId);
  const societyId = profile?.societyId;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  const generateReport = useAction(api.reports.generateMonthlyReport);

  const skip = !(societyId && blockId);
  const args = skip ? ("skip" as const) : { societyId, blockId, year, month };

  const waterSummary = useQuery(api.reports.getMonthlyWaterSummary, args);
  const powerSummary = useQuery(api.reports.getMonthlyPowerSummary, args);
  const wasteSummary = useQuery(api.reports.getMonthlyWasteSummary, args);
  const gasSummary = useQuery(api.reports.getMonthlyGasSummary, args);
  const sewageSummary = useQuery(api.reports.getMonthlySewageSummary, args);

  async function handleGenerateAI() {
    if (!societyId || !blockId) return;
    setGenerating(true);
    try {
      const result = await generateReport({ societyId: societyId as any, blockId: blockId as any });
      setAiReport(result);
      toast.success("AI report generated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPDF() {
    if (typeof window === "undefined") return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const monthLabel = `${MONTHS[month - 1]} ${year}`;

      doc.setFillColor(20, 10, 40);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("BlockSense Monthly Report", 14, 14);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(monthLabel, 14, 23);
      doc.setTextColor(26, 26, 26);

      let y = 40;

      if (aiReport?.narrative) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(110, 50, 180);
        doc.text("AI Executive Summary", 14, y);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(aiReport.narrative, 182) as string[];
        y += 7;
        doc.text(lines, 14, y);
        y += lines.length * 5 + 8;
      }

      const addSection = (title: string, body: [string, string][], color: [number, number, number]) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
        doc.text(title, 14, y);
        doc.setTextColor(26, 26, 26);
        y += 5;
        autoTable(doc, {
          startY: y,
          head: [["Metric", "Value"]],
          body,
          theme: "grid",
          styles: { fontSize: 9, font: "helvetica" },
          headStyles: { fillColor: color, textColor: [255, 255, 255] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      };

      if (waterSummary) addSection("Water", [
        ["Total consumption", `${waterSummary.totalConsumptionKL} KL`],
        ["Tanker orders", String(waterSummary.tankerCount)],
        ["Tanker volume", `${waterSummary.tankerKL} KL`],
        ["Tanker cost", `₹${waterSummary.tankerCost.toLocaleString()}`],
      ], [24, 95, 165]);

      if (powerSummary) addSection("Power", [
        ["Total consumption", `${powerSummary.totalConsumptionKWH} kWh`],
        ["Outages", String(powerSummary.outageCount)],
        ["Outage hours", `${powerSummary.totalOutageHrs.toFixed(1)} h`],
        ["Diesel used", `${powerSummary.totalDieselUsedL.toFixed(1)} L`],
      ], [133, 79, 11]);

      if (gasSummary) addSection("Gas", [
        ["Total consumption", `${gasSummary.totalConsumptionSCM} SCM`],
        ["Avg pressure", `${gasSummary.avgPressurePSI} PSI`],
        ["Readings", String(gasSummary.readings)],
        ["Last meter", String(gasSummary.lastMeterReading)],
      ], [15, 110, 86]);

      if (sewageSummary) addSection("Sewage / STP", [
        ["Readings logged", String(sewageSummary.readings)],
        ["Normal uptime", `${sewageSummary.uptimePct}%`],
        ["Avg sludge level", `${sewageSummary.avgSludgePct}%`],
      ], [153, 60, 29]);

      if (wasteSummary) addSection("Waste", [
        ["Total waste", `${wasteSummary.totalKG} KG`],
        ["Dry waste", `${wasteSummary.dryKG} KG`],
        ["Wet waste", `${wasteSummary.wetKG} KG`],
        ["Segregation compliance", `${wasteSummary.segregationCompliance}%`],
      ], [153, 53, 86]);

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated by BlockSense on ${new Date().toLocaleDateString("en-IN")}`, 14, doc.internal.pageSize.height - 8);
      doc.save(`blocksense-${year}-${String(month).padStart(2, "0")}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          Monthly Reports
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleGenerateAI} disabled={generating || skip} className="bg-purple-600 hover:bg-purple-500 h-9">
            {generating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Generate AI Report
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={exporting || skip} className="border-white/10 h-9">
            {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* AI Narrative */}
      {aiReport?.narrative && (
        <ScrollReveal>
          <motion.div
            className="rounded-2xl p-5 space-y-2"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))", border: "1px solid rgba(168,85,247,0.25)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="font-semibold text-purple-200 text-sm">AI Executive Summary</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                {MONTHS[month - 1]} {year}
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{aiReport.narrative}</p>
            {aiReport.payments && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(168,85,247,0.2)" }}>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-base font-bold text-green-300">₹{(aiReport.payments.collected as number)?.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-base font-bold text-red-300">₹{(aiReport.payments.outstanding as number)?.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Defaulters</p>
                  <p className="text-base font-bold text-yellow-300">{aiReport.payments.defaulters}</p>
                </div>
              </div>
            )}
          </motion.div>
        </ScrollReveal>
      )}

      {/* Utility cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Water */}
        <ScrollReveal delay={0.05}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-400" /> Water
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!waterSummary ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <dl>
                  <ReportRow label="Total consumption" value={`${waterSummary.totalConsumptionKL} KL`} />
                  <ReportRow label="Tanker orders" value={String(waterSummary.tankerCount)} />
                  <ReportRow label="Tanker volume" value={`${waterSummary.tankerKL} KL`} />
                  <ReportRow label="Tanker cost" value={`₹${waterSummary.tankerCost.toLocaleString()}`} highlight />
                </dl>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Power */}
        <ScrollReveal delay={0.08}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!powerSummary ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <dl>
                  <ReportRow label="Total consumption" value={`${powerSummary.totalConsumptionKWH} kWh`} />
                  <ReportRow label="Outages" value={String(powerSummary.outageCount)} />
                  <ReportRow label="Outage hours" value={`${powerSummary.totalOutageHrs.toFixed(1)} h`} />
                  <ReportRow label="Diesel used" value={`${powerSummary.totalDieselUsedL.toFixed(1)} L`} highlight />
                </dl>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Gas */}
        <ScrollReveal delay={0.11}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-emerald-400" /> Gas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!gasSummary ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <dl>
                  <ReportRow label="Total consumption" value={`${gasSummary.totalConsumptionSCM} SCM`} />
                  <ReportRow label="Avg pressure" value={`${gasSummary.avgPressurePSI} PSI`} />
                  <ReportRow label="Readings" value={String(gasSummary.readings)} />
                  <ReportRow label="Last meter" value={String(gasSummary.lastMeterReading)} highlight />
                </dl>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Sewage */}
        <ScrollReveal delay={0.14}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wind className="h-4 w-4 text-orange-400" /> Sewage / STP
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sewageSummary ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <dl>
                  <ReportRow label="Readings logged" value={String(sewageSummary.readings)} />
                  <ReportRow label="Normal uptime" value={`${sewageSummary.uptimePct}%`} highlight />
                  <ReportRow label="Avg sludge level" value={`${sewageSummary.avgSludgePct}%`} />
                </dl>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Waste */}
        <ScrollReveal delay={0.17}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-pink-400" /> Solid Waste
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!wasteSummary ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <dl>
                  <ReportRow label="Total waste" value={`${wasteSummary.totalKG} KG`} />
                  <ReportRow label="Dry waste" value={`${wasteSummary.dryKG} KG`} />
                  <ReportRow label="Wet waste" value={`${wasteSummary.wetKG} KG`} />
                  <ReportRow label="Segregation" value={`${wasteSummary.segregationCompliance}%`} highlight />
                </dl>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Generate prompt card */}
        {!aiReport && (
          <ScrollReveal delay={0.2}>
            <div
              className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all min-h-[160px]"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px dashed rgba(168,85,247,0.3)" }}
              onClick={handleGenerateAI}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                {generating ? <Loader2 className="h-5 w-5 text-purple-400 animate-spin" /> : <Sparkles className="h-5 w-5 text-purple-400" />}
              </div>
              <p className="text-sm font-medium text-purple-300 text-center">
                {generating ? "Generating AI summary…" : "Click to generate AI executive summary"}
              </p>
              <p className="text-xs text-muted-foreground text-center">Powered by Claude — analyzes all utilities and payments</p>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
