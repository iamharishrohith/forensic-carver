"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Brain, 
  Check, 
  X, 
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import "./insights.css";

export default function AIInsights() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchDecisions = () => {
    setLoading(true);
    api.getCaseDecisions(caseId)
      .then((data) => setDecisions(data))
      .catch((err) => console.error("Error loading case decisions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDecisions();
  }, [caseId]);

  const handleDecisionAction = async (decisionId, status) => {
    try {
      await api.updateDecision(decisionId, status);
      
      setDecisions(prev => prev.map(d => {
        if (d.id === decisionId) {
          return { ...d, status };
        }
        return d;
      }));

      setActionSuccess(`Decision has been successfully logged as ${status.toUpperCase()} in the ledger.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Failed to save investigator verification: ${err.message}`);
    }
  };

  return (
    <div className="insights-container">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span className="sidebar-label">Decision Auditing</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">AI Insights & Agent Activity</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Explainable AI decision center. Review agent verdicts and manually validate before adding to court reports.
          </p>
        </div>
      </div>

      {/* Action Notification banner */}
      {actionSuccess && (
        <div className="alert-banner success">
          <Check style={{ height: "1rem", width: "1rem" }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Explainable AI Grid */}
      {loading ? (
        <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "6rem 0" }}>
          <div className="loader-content">
            <div className="loader-spinner"></div>
            <p className="loader-text">Synchronizing agent explanations ledger...</p>
          </div>
        </div>
      ) : decisions.length > 0 ? (
        <div className="insights-grid">
          {decisions.map((dec) => {
            const isApproved = dec.status === "approved";
            const isRejected = dec.status === "rejected";
            
            return (
              <div 
                key={dec.id} 
                className="glass-card verdict-item"
                style={{
                  borderRadius: "var(--radius)",
                  border: isApproved 
                    ? "1px solid rgba(16, 185, 129, 0.2)" 
                    : isRejected 
                    ? "1px solid rgba(239, 68, 68, 0.2)"
                    : "1px solid var(--border)",
                  background: isApproved 
                    ? "rgba(16, 185, 129, 0.03)" 
                    : isRejected 
                    ? "rgba(239, 68, 68, 0.03)"
                    : "var(--card)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1.25rem",
                  padding: "1.25rem"
                }}
              >
                {/* Top Header */}
                <div className="inspector-section" style={{ gap: "0.75rem" }}>
                  <div className="pipeline-header">
                    <div className="event-source" style={{ color: "#ffffff" }}>
                      <Activity className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
                      <span className="font-semibold text-xs truncate" style={{ maxWidth: "180px" }}>{dec.agent_name}</span>
                    </div>
                    <span className="verdict-confidence-badge">
                      {(dec.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                    <span className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Agent Suggestion</span>
                    <p className="text-zinc-200 text-xs font-semibold leading-relaxed">
                      {dec.decision}
                    </p>
                  </div>

                  <div className="text-xs" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span className="sidebar-label">Explainability Reasoning</span>
                    <p className="text-zinc-400 leading-relaxed font-medium">
                      {dec.reasoning}
                    </p>
                  </div>
                </div>

                {/* Action buttons: Human in the loop */}
                <div className="verdict-item-header" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                  <div>
                    <span className="sidebar-label">Verification Status</span>
                    {dec.status === "pending_approval" && (
                      <span className="text-yellow-400 font-semibold uppercase tracking-wider text-[10px] flex items-center mt-0.5" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full animate-pulse" style={{ display: "inline-block", height: "0.375rem", width: "0.375rem", borderRadius: "50%" }}></span>
                        <span>Pending Investigator</span>
                      </span>
                    )}
                    {dec.status === "approved" && (
                      <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] flex items-center mt-0.5" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <Check style={{ height: "0.75rem", width: "0.75rem" }} />
                        <span>Approved & Committed</span>
                      </span>
                    )}
                    {dec.status === "rejected" && (
                      <span className="text-red-400 font-semibold uppercase tracking-wider text-[10px] flex items-center mt-0.5" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <X style={{ height: "0.75rem", width: "0.75rem" }} />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  {dec.status === "pending_approval" ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button 
                        onClick={() => handleDecisionAction(dec.id, "approved")}
                        className="btn-primary"
                        style={{ padding: "0.375rem 0.5rem" }}
                        title="Approve Recommendation"
                      >
                        <Check style={{ height: "1rem", width: "1rem" }} />
                      </button>
                      <button 
                        onClick={() => handleDecisionAction(dec.id, "rejected")}
                        className="btn-secondary"
                        style={{ padding: "0.375rem 0.5rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171" }}
                        title="Reject Recommendation"
                      >
                        <X style={{ height: "1rem", width: "1rem" }} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleDecisionAction(dec.id, "pending_approval")}
                      className="btn-secondary"
                      style={{ padding: "0.375rem 0.75rem", fontSize: "10px" }}
                    >
                      Reset Action
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-timeline-placeholder">
          <Brain className="text-zinc-600 mb-3" style={{ height: "2.5rem", width: "2.5rem", margin: "0 auto" }} />
          <p className="loader-text">No agent records compiled. Upload evidence files to launch AI Orchestrations.</p>
        </div>
      )}
    </div>
  );
}
