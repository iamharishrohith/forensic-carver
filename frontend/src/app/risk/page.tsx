"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Brain,
  Layers,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";

const RISK_BADGES: Record<string, any> = {
  Critical: {
    bg: "bg-red-950/20 border-red-500/30 text-red-400",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    text: "CRITICAL RISK LEVEL DETECTED",
    desc: "Immediate safeguarding intervention is highly recommended. Exploit markers suggest coercive patterns or immediate threats."
  },
  High: {
    bg: "bg-orange-950/20 border-orange-500/30 text-orange-400",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
    text: "HIGH RISK LEVEL DETECTED",
    desc: "Active suspicious communications or media matches are present. Prioritized review of connected evidence files required."
  },
  Medium: {
    bg: "bg-yellow-950/20 border-yellow-500/30 text-yellow-400",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.1)]",
    text: "MEDIUM RISK LEVEL DETECTED",
    desc: "Indicative metadata coordinates or vocabulary checks flagged for further investigator verification."
  },
  Low: {
    bg: "bg-emerald-950/20 border-emerald-500/30 text-emerald-400",
    glow: "none",
    text: "LOW RISK LEVEL DETECTED",
    desc: "Baseline background checks completed. No immediate threatening markers isolated."
  }
};

export default function RiskCenter() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [stats, setStats] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAnalytics(caseId),
      api.getCaseDecisions(caseId)
    ])
      .then(([statsData, decsData]) => {
        setStats(statsData);
        // Isolate decisions from Agent 7 (Risk) and Agent 10 (Copilot Recommendations)
        setDecisions(decsData);
      })
      .catch((err) => console.error("Error loading risk details:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Evaluating risk models...</p>
        </div>
      </div>
    );
  }

  // Find risk assessment decision
  const riskDecision = decisions.find(d => d.agent_name.includes("Agent 7: Risk Assessment Agent"));
  const copilotDecision = decisions.find(d => d.agent_name.includes("Agent 10: Investigation Copilot Agent"));

  // Determine active level
  let activeLevel = "Low";
  if (riskDecision) {
    if (riskDecision.decision.includes("Critical")) activeLevel = "Critical";
    else if (riskDecision.decision.includes("High")) activeLevel = "High";
    else if (riskDecision.decision.includes("Medium")) activeLevel = "Medium";
  }

  const activeBadge = RISK_BADGES[activeLevel] || RISK_BADGES["Low"];

  // Parse recommendations from copilot decision text
  const recommendations = copilotDecision 
    ? copilotDecision.decision.replace("Recommended steps: ", "").split(" | ") 
    : ["Run initial metadata scanning.", "Confirm chain-of-custody hashes."];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Safeguarding Hub</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Risk Center</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Synthesized AI threat matrix scoring case risk indicators, confidence rates, and copilot leads.
        </p>
      </div>

      {/* Primary Risk Status Alert Box */}
      <div className={`glass-card border p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6 ${activeBadge.bg} ${activeBadge.glow}`}>
        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <ShieldAlert className="h-10 w-10 text-inherit" />
        </div>
        <div className="space-y-2 text-center md:text-left flex-1">
          <h3 className="text-xl font-bold tracking-wide">{activeBadge.text}</h3>
          <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">{activeBadge.desc}</p>
          {riskDecision && (
            <div className="flex items-center justify-center md:justify-start space-x-2 mt-4 text-xs font-mono text-zinc-500">
              <span>Agent Confidence Score:</span>
              <span className="text-purple-400 font-semibold">{(riskDecision.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Indicators Checkbox Checklist */}
        <div className="glass-card p-6 rounded-xl space-y-6">
          <h4 className="font-semibold text-zinc-200 flex items-center space-x-2 border-b border-zinc-800 pb-4">
            <Layers className="h-5 w-5 text-purple-400" />
            <span>AI Risk Matrix Indicators</span>
          </h4>

          <div className="space-y-4">
            <div className="flex items-start justify-between bg-zinc-950/40 p-4 rounded-xl border border-zinc-800">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-200 block">Threat & Grooming Vocabulary</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Scans texts for secrecy demands, meeting schedules, or coercion keywords.
                </p>
              </div>
              {activeLevel === "Critical" || activeLevel === "High" ? (
                <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/20 font-medium">Flagged Alert</span>
              ) : (
                <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded border border-zinc-700">Clear</span>
              )}
            </div>

            <div className="flex items-start justify-between bg-zinc-950/40 p-4 rounded-xl border border-zinc-800">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-200 block">Evolutionary GPS Geotags</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Detects coordinate footprints in image EXIF tags matching sensitive bounds.
                </p>
              </div>
              {stats.high_risk_alerts > 0 ? (
                <span className="bg-yellow-500/10 text-yellow-400 text-[10px] px-2 py-0.5 rounded border border-yellow-500/20 font-medium">Coordinate Found</span>
              ) : (
                <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded border border-zinc-700">Clear</span>
              )}
            </div>

            <div className="flex items-start justify-between bg-zinc-950/40 p-4 rounded-xl border border-zinc-800">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-200 block">Cross-Case Match Check</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Scans central DB for matching phone, email, or device fingerprints in older logs.
                </p>
              </div>
              {activeLevel === "Critical" ? (
                <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/20 font-medium">Central Match</span>
              ) : (
                <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded border border-zinc-700">Clear</span>
              )}
            </div>
          </div>
        </div>

        {/* Safeguarding Action Leads */}
        <div className="glass-card p-6 rounded-xl space-y-6">
          <h4 className="font-semibold text-zinc-200 flex items-center space-x-2 border-b border-zinc-800 pb-4">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <span>Copilot Suggested Actions</span>
          </h4>

          <div className="space-y-3.5">
            {recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start space-x-3 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 leading-normal">
                <ArrowRight className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-zinc-200 font-medium block">Investigation Action Lead #{i+1}</span>
                  <p className="text-zinc-400 leading-relaxed">{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reasoning explanation box */}
      {riskDecision && (
        <div className="glass-card p-6 rounded-xl space-y-3 border-l-4 border-purple-500">
          <h4 className="font-semibold text-zinc-200 flex items-center space-x-2 text-sm">
            <Brain className="h-4 w-4 text-purple-400" />
            <span>AI Risk Assessment Reasoning Justification</span>
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            {riskDecision.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
