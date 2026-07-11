"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  FolderOpen, 
  Brain, 
  Activity, 
  Search,
  Upload, 
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileDown
} from "lucide-react";
import { api } from "@/lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import Link from "next/link";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#6b7280"];
const URGENCY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#10b981"
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [stats, setStats] = useState<any>(null);
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.getAnalytics(caseId),
      api.getCase(caseId),
      api.getAudit(caseId)
    ])
      .then(([statsData, caseData, auditData]) => {
        setStats(statsData);
        setCaseDetail(caseData);
        setRecentAudits(auditData.slice(0, 5)); // Get recent 5
      })
      .catch((err) => {
        console.error("Dashboard data error:", err);
        setError("Could not retrieve investigation details. Ensure backend server is running.");
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Synchronizing dashboard intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-12 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center space-x-4">
        <AlertTriangle className="h-12 w-12 text-red-500 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-red-300">System Connection Error</h3>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
          <div className="mt-4 flex items-center space-x-2">
            <code className="bg-black/40 text-[11px] px-2 py-1 rounded border border-zinc-800 text-zinc-300">python run.py</code>
            <span className="text-xs text-zinc-500">Run this command in the backend folder to launch database.</span>
          </div>
        </div>
      </div>
    );
  }

  // Pre-process data for charts
  const barData = stats.evidence_types.map((t: any) => ({
    name: t.type,
    count: t.count
  })).filter((t: any) => t.count > 0);

  const pieData = stats.urgency_distribution.map((t: any) => ({
    name: t.level,
    value: t.count
  })).filter((t: any) => t.value > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Digital Investigation Suite</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">
            {caseDetail?.name || "Operation Overview"}
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
            {caseDetail?.description || "Loading case description records..."}
          </p>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => window.open(`http://127.0.0.1:8000/api/v1/cases/${caseId}/report`)}
            className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-purple-400" />
            <span>Download Report</span>
          </button>
          <Link href={`/evidence?case_id=${caseId}`}>
            <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Upload Evidence</span>
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Evidence Files</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">{stats.total_evidence}</h3>
          </div>
          <div className="bg-blue-600/10 p-3 rounded-lg border border-blue-500/20">
            <FolderOpen className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">High Risk Alerts</span>
            <h3 className="text-3xl font-extrabold text-red-400 mt-2">{stats.high_risk_alerts}</h3>
          </div>
          <div className="bg-red-600/10 p-3 rounded-lg border border-red-500/20">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Agent Recommendations</span>
            <h3 className="text-3xl font-extrabold text-purple-400 mt-2">{stats.pending_agent_decisions}</h3>
          </div>
          <div className="bg-purple-600/10 p-3 rounded-lg border border-purple-500/20">
            <Brain className="h-6 w-6 text-purple-400" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Audit Log Items</span>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{recentAudits.length}</h3>
          </div>
          <div className="bg-emerald-600/10 p-3 rounded-lg border border-emerald-500/20">
            <Activity className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Evidence Distribution Chart */}
        <div className="glass-card p-6 rounded-xl col-span-2 space-y-4">
          <h4 className="font-semibold text-zinc-200">Evidence Distribution</h4>
          <div className="h-64 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
                    itemStyle={{ color: "#a78bfa" }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No evidence files cataloged yet.
              </div>
            )}
          </div>
        </div>

        {/* Threat Distribution Pie */}
        <div className="glass-card p-6 rounded-xl space-y-4">
          <h4 className="font-semibold text-zinc-200">Urgency Classification</h4>
          <div className="h-64 w-full relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No processed cases.
              </div>
            )}
            {pieData.length > 0 && (
              <div className="absolute flex flex-col items-center">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Urgent</span>
                <span className="text-xl font-bold text-white">
                  {pieData.reduce((acc: number, curr: any) => acc + curr.value, 0)} Items
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agents & Audit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent Orchestrator Activity Status */}
        <div className="glass-card p-6 rounded-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h4 className="font-semibold text-zinc-200 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span>Multi-Agent System Activity</span>
            </h4>
            <span className="bg-purple-600/20 text-purple-300 text-[10px] px-2 py-0.5 rounded font-semibold border border-purple-500/20 animate-pulse">
              Orchestrator Online
            </span>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {stats.agent_activities.map((agent: any) => (
              <div key={agent.agent_name} className="flex items-center justify-between text-sm bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                <div className="flex items-center space-x-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    agent.status === "active" 
                      ? "bg-purple-500 animate-pulse" 
                      : agent.status === "completed" 
                      ? "bg-emerald-500" 
                      : "bg-zinc-600"
                  }`} />
                  <span className="font-medium text-zinc-300">{agent.agent_name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-zinc-500 capitalize">{agent.status}</span>
                  {agent.status === "active" && (
                    <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-500 h-full animate-pulse" style={{ width: `${agent.progress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chain of Custody Audit Log */}
        <div className="glass-card p-6 rounded-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h4 className="font-semibold text-zinc-200 flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-emerald-400" />
              <span>Forensic Chain of Custody Log</span>
            </h4>
            <Link href={`/audit?case_id=${caseId}`} className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1">
              <span>View Full Ledger</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentAudits.length > 0 ? (
              recentAudits.map((log: any) => (
                <div key={log.id} className="text-xs border-l-2 border-emerald-500 pl-4 py-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300">{log.action}</span>
                    <span className="text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{log.details}</p>
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-500">
                    <span>User: {log.user}</span>
                    {log.sha256_hash && (
                      <>
                        <span>•</span>
                        <span className="font-mono">Hash: {log.sha256_hash.substring(0, 16)}...</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500">
                No forensic logs registered. Upload files to generate log histories.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
