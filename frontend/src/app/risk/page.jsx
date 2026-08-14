"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  Brain,
  Layers,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import "./risk.css";

const RISK_BADGES = {
  Critical: {
    bg: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#fca5a5",
    text: "CRITICAL RISK LEVEL DETECTED",
    desc: "Immediate safeguarding intervention is highly recommended. Exploit markers suggest coercive patterns or immediate threats."
  },
  High: {
    bg: "rgba(249, 115, 22, 0.05)",
    border: "1px solid rgba(249, 115, 22, 0.2)",
    color: "#ffedd5",
    text: "HIGH RISK LEVEL DETECTED",
    desc: "Active suspicious communications or media matches are present. Prioritized review of connected evidence files required."
  },
  Medium: {
    bg: "rgba(234, 179, 8, 0.05)",
    border: "1px solid rgba(234, 179, 8, 0.2)",
    color: "#fef9c3",
    text: "MEDIUM RISK LEVEL DETECTED",
    desc: "Indicative metadata coordinates or vocabulary checks flagged for further investigator verification."
  },
  Low: {
    bg: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    color: "#d1fae5",
    text: "LOW RISK LEVEL DETECTED",
    desc: "Baseline background checks completed. No immediate threatening markers isolated."
  }
};

export default function RiskCenter() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [stats, setStats] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAnalytics(caseId),
      api.getCaseDecisions(caseId)
    ])
      .then(([statsData, decsData]) => {
        setStats(statsData);
        setDecisions(decsData);
      })
      .catch((err) => console.error("Error loading risk details:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-content">
          <div className="loader-spinner"></div>
          <p className="loader-text">Evaluating risk models...</p>
        </div>
      </div>
    );
  }

  const riskDecision = decisions.find(d => d.agent_name.includes("Agent 7: Risk Assessment Agent"));
  const copilotDecision = decisions.find(d => d.agent_name.includes("Agent 10: Investigation Copilot Agent"));

  let activeLevel = "Low";
  if (riskDecision) {
    if (riskDecision.decision.includes("Critical")) activeLevel = "Critical";
    else if (riskDecision.decision.includes("High")) activeLevel = "High";
    else if (riskDecision.decision.includes("Medium")) activeLevel = "Medium";
  }

  const activeBadge = RISK_BADGES[activeLevel] || RISK_BADGES["Low"];

  const recommendations = copilotDecision 
    ? copilotDecision.decision.replace("Recommended steps: ", "").split(" | ") 
    : ["Run initial metadata scanning.", "Confirm chain-of-custody hashes."];

  return (
    <div className="risk-container">
      {/* Title */}
      <div>
        <span className="sidebar-label">Safeguarding Hub</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Risk Center</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Synthesized AI threat matrix scoring case risk indicators, confidence rates, and copilot leads.
        </p>
      </div>

      {/* Primary Risk Status Alert Box */}
      <div 
        className="glass-card risk-hero-card" 
        style={{ 
          background: activeBadge.bg,
          border: activeBadge.border,
          color: activeBadge.color
        }}
      >
        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ShieldAlert style={{ height: "2.5rem", width: "2.5rem" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1 }}>
          <h3 className="text-xl font-bold tracking-wide">{activeBadge.text}</h3>
          <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">{activeBadge.desc}</p>
          {riskDecision && (
            <div className="event-source" style={{ fontSize: "11px", fontFamily: "monospace", marginTop: "0.5rem" }}>
              <span>Agent Confidence Score:</span>
              <span className="text-purple-400 font-semibold">{(riskDecision.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="double-panel-grid">
        {/* Risk Indicators Checkbox Checklist */}
        <div className="glass-card panel-card">
          <h4 className="panel-title">
            <Layers className="panel-title-icon" />
            <span>AI Risk Matrix Indicators</span>
          </h4>

          <div className="verdict-list" style={{ maxHeight: "none", gap: "1rem" }}>
            <div className="verdict-item-header" style={{ background: "rgba(9, 9, 11, 0.4)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span className="text-xs font-semibold text-zinc-200 block">Threat & Grooming Vocabulary</span>
                <p className="text-zinc-500 font-medium" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                  Scans texts for secrecy demands, meeting schedules, or coercion keywords.
                </p>
              </div>
              {activeLevel === "Critical" || activeLevel === "High" ? (
                <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontWeight: "500", whiteSpace: "nowrap" }}>Flagged Alert</span>
              ) : (
                <span style={{ background: "#27272a", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", whiteSpace: "nowrap" }}>Clear</span>
              )}
            </div>

            <div className="verdict-item-header" style={{ background: "rgba(9, 9, 11, 0.4)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span className="text-xs font-semibold text-zinc-200 block">Evolutionary GPS Geotags</span>
                <p className="text-zinc-500 font-medium" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                  Detects coordinate footprints in image EXIF tags matching sensitive bounds.
                </p>
              </div>
              {stats?.high_risk_alerts > 0 ? (
                <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontWeight: "500", whiteSpace: "nowrap" }}>Coordinate Found</span>
              ) : (
                <span style={{ background: "#27272a", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", whiteSpace: "nowrap" }}>Clear</span>
              )}
            </div>

            <div className="verdict-item-header" style={{ background: "rgba(9, 9, 11, 0.4)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span className="text-xs font-semibold text-zinc-200 block">Cross-Case Match Check</span>
                <p className="text-zinc-500 font-medium" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                  Scans central DB for matching phone, email, or device fingerprints in older logs.
                </p>
              </div>
              {activeLevel === "Critical" ? (
                <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontWeight: "500", whiteSpace: "nowrap" }}>Central Match</span>
              ) : (
                <span style={{ background: "#27272a", color: "var(--muted)", border: "1px solid var(--border)", fontSize: "10px", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", whiteSpace: "nowrap" }}>Clear</span>
              )}
            </div>
          </div>
        </div>

        {/* Safeguarding Action Leads */}
        <div className="glass-card panel-card">
          <h4 className="panel-title">
            <UserCheck className="text-emerald-400" style={{ height: "1.25rem", width: "1.25rem" }} />
            <span>Copilot Suggested Actions</span>
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {recommendations.map((rec, i) => (
              <div key={i} className="verdict-item" style={{ background: "rgba(9, 9, 11, 0.6)", padding: "1rem", gap: "0.5rem" }}>
                <div className="event-source" style={{ color: "#ffffff" }}>
                  <ArrowRight className="text-emerald-400 flex-shrink-0" style={{ height: "1rem", width: "1rem" }} />
                  <span className="font-bold">Investigation Action Lead #{i+1}</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reasoning explanation box */}
      {riskDecision && (
        <div className="glass-card p-6" style={{ borderRadius: "var(--radius)", borderLeft: "4px solid var(--primary)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h4 className="panel-title">
            <Brain className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
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
