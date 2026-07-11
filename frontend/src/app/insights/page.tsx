"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Brain, 
  Check, 
  X, 
  HelpCircle, 
  Activity, 
  AlertTriangle,
  FolderOpen,
  MessageSquare
} from "lucide-react";
import { api } from "@/lib/api";

export default function AIInsights() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  const handleDecisionAction = async (decisionId: number, status: "approved" | "rejected" | "pending_approval") => {
    try {
      await api.updateDecision(decisionId, status);
      
      // Update local state state to reflect status change immediately
      setDecisions(prev => prev.map(d => {
        if (d.id === decisionId) {
          return { ...d, status };
        }
        return d;
      }));

      setActionSuccess(`Decision has been successfully logged as ${status.toUpperCase()} in the ledger.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(`Failed to save investigator verification: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Decision Auditing</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">AI Insights & Agent Activity</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Explainable AI decision center. Review agent verdicts and manually validate before adding to court reports.
          </p>
        </div>
      </div>

      {/* Action Notification banner */}
      {actionSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-lg flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
          <Check className="h-4 w-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Explainable AI Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Synchronizing agent explanations ledger...</p>
        </div>
      ) : decisions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decisions.map((dec) => (
            <div 
              key={dec.id} 
              className={`glass-card p-5 rounded-xl border flex flex-col justify-between space-y-5 transition-all ${
                dec.status === "approved" 
                  ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_8px_rgba(16,185,129,0.05)]" 
                  : dec.status === "rejected" 
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-zinc-800"
              }`}
            >
              {/* Top Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="font-semibold text-xs truncate max-w-[180px]">{dec.agent_name}</span>
                  </div>
                  <span className="text-[10px] bg-purple-950/40 text-purple-400 border border-purple-900/30 px-2 py-0.5 rounded font-mono">
                    {(dec.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>

                <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                  <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Agent Suggestion</span>
                  <p className="text-zinc-200 text-xs font-semibold leading-relaxed">
                    {dec.decision}
                  </p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider block">Explainability Reasoning</span>
                  <p className="text-zinc-400 leading-relaxed font-medium">
                    {dec.reasoning}
                  </p>
                </div>
              </div>

              {/* Action buttons: Human in the loop */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40 text-xs">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-semibold">Verification Status</span>
                  {dec.status === "pending_approval" && (
                    <span className="text-yellow-400 font-semibold uppercase tracking-wider text-[10px] flex items-center space-x-1 mt-0.5">
                      <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full animate-ping"></span>
                      <span>Pending Investigator</span>
                    </span>
                  )}
                  {dec.status === "approved" && (
                    <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] flex items-center space-x-1 mt-0.5">
                      <Check className="h-3 w-3" />
                      <span>Approved & Committed</span>
                    </span>
                  )}
                  {dec.status === "rejected" && (
                    <span className="text-red-400 font-semibold uppercase tracking-wider text-[10px] flex items-center space-x-1 mt-0.5">
                      <X className="h-3 w-3" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>

                {dec.status === "pending_approval" ? (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleDecisionAction(dec.id, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg font-semibold flex items-center justify-center border border-emerald-500/20 focus:outline-none transition-all"
                      title="Approve Recommendation"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDecisionAction(dec.id, "rejected")}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg font-semibold flex items-center justify-center border border-red-500/20 focus:outline-none transition-all"
                      title="Reject Recommendation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleDecisionAction(dec.id, "pending_approval")}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold border border-zinc-800 hover:border-zinc-700 bg-zinc-950 px-2.5 py-1.5 rounded-lg transition-all focus:outline-none"
                  >
                    Reset Action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-zinc-900/30 border border-zinc-800 rounded-xl">
          <Brain className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-500 text-sm">No agent records compiled. Upload evidence files to launch AI Orchestrations.</p>
        </div>
      )}
    </div>
  );
}
