"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  FolderOpen, 
  Brain, 
  Activity, 
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
import "./dashboard.css";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#6b7280"];
const URGENCY_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#10b981"
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [stats, setStats] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getAnalytics(caseId),
      api.getCase(caseId),
      api.getAudit(caseId)
    ])
      .then(([statsData, caseData, auditData]) => {
        if (isMounted) {
          setStats(statsData);
          setCaseDetail(caseData);
          setRecentAudits(auditData.slice(0, 5));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Dashboard data error:", err);
        if (isMounted) {
          setError("Could not retrieve investigation details. Ensure backend server is running.");
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [caseId]);

  if (loading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-content">
          <div className="loader-spinner"></div>
          <p className="loader-text">Synchronizing dashboard intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <AlertTriangle className="text-destructive" style={{ height: "3rem", width: "3rem" }} />
        <div>
          <h3 className="error-title">System Connection Error</h3>
          <p className="error-desc">{error}</p>
          <div className="error-instruction">
            <code className="error-code">python run.py</code>
            <span className="error-hint">Run this command in the backend folder to launch database.</span>
          </div>
        </div>
      </div>
    );
  }

  const barData = stats.evidence_types.map((t) => ({
    name: t.type,
    count: t.count
  })).filter((t) => t.count > 0);

  const pieData = stats.urgency_distribution.map((t) => ({
    name: t.level,
    value: t.count
  })).filter((t) => t.value > 0);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <span className="dashboard-meta-badge">Digital Investigation Suite</span>
          <h2 className="text-3xl font-bold text-white mt-1">
            {caseDetail?.name || "Operation Overview"}
          </h2>
          <p className="dashboard-subtitle">
            {caseDetail?.description || "Loading case description records..."}
          </p>
        </div>
        
        {/* Quick action buttons */}
        <div className="dashboard-actions">
          <button 
            onClick={() => window.open(`http://127.0.0.1:8000/api/v1/cases/${caseId}/report`)}
            className="btn-secondary"
          >
            <FileDown className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
            <span>Download Report</span>
          </button>
          <Link href={`/evidence?case_id=${caseId}`}>
            <button className="btn-primary">
              <Upload style={{ height: "1rem", width: "1rem" }} />
              <span>Upload Evidence</span>
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card blue">
          <div>
            <span className="kpi-card-title">Total Evidence Files</span>
            <h3>{stats.total_evidence}</h3>
          </div>
          <div className="icon-container">
            <FolderOpen className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />
          </div>
        </div>

        <div className="glass-card kpi-card red">
          <div>
            <span className="kpi-card-title">High Risk Alerts</span>
            <h3 style={{ color: "#f87171" }}>{stats.high_risk_alerts}</h3>
          </div>
          <div className="icon-container">
            <ShieldAlert className="text-destructive" style={{ height: "1.5rem", width: "1.5rem" }} />
          </div>
        </div>

        <div className="glass-card kpi-card purple">
          <div>
            <span className="kpi-card-title">Agent Recommendations</span>
            <h3 style={{ color: "#a78bfa" }}>{stats.pending_agent_decisions}</h3>
          </div>
          <div className="icon-container">
            <Brain className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />
          </div>
        </div>

        <div className="glass-card kpi-card emerald">
          <div>
            <span className="kpi-card-title">Audit Log Items</span>
            <h3 style={{ color: "#34d399" }}>{recentAudits.length}</h3>
          </div>
          <div className="icon-container">
            <Activity className="text-white" style={{ height: "1.5rem", width: "1.5rem" }} />
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="charts-grid">
        {/* Evidence Distribution Chart */}
        <div className="glass-card chart-card chart-card-large">
          <h4>Evidence Distribution</h4>
          <div className="chart-container">
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
              <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none" }}>
                <p className="loader-text">No evidence files cataloged yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Threat Distribution Pie */}
        <div className="glass-card chart-card">
          <h4>Urgency Classification</h4>
          <div className="chart-container" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none" }}>
                <p className="loader-text">No processed cases.</p>
              </div>
            )}
            {pieData.length > 0 && (
              <div className="urgency-badge-center">
                <span className="urgency-center-label">Urgent</span>
                <span className="urgency-center-value">
                  {pieData.reduce((acc, curr) => acc + curr.value, 0)} Items
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agents & Audit Ledger */}
      <div className="double-panel-grid">
        {/* Agent Orchestrator Activity Status */}
        <div className="glass-card panel-card">
          <div className="panel-header">
            <h4 className="panel-title">
              <Brain className="panel-title-icon" />
              <span>Multi-Agent System Activity</span>
            </h4>
            <span className="panel-badge animate-pulse">
              Orchestrator Online
            </span>
          </div>

          <div className="agent-status-list">
            {stats.agent_activities.map((agent) => (
              <div key={agent.agent_name} className="agent-status-item">
                <div className="agent-item-left">
                  <div className={`agent-indicator ${
                    agent.status === "active" 
                      ? "active animate-pulse" 
                      : agent.status === "completed" 
                      ? "completed" 
                      : "idle"
                  }`} />
                  <span className="font-medium text-zinc-300">{agent.agent_name}</span>
                </div>
                <div className="agent-progress-area">
                  <span className="agent-progress-label">{agent.status}</span>
                  {agent.status === "active" && (
                    <div className="progress-bar">
                      <div className="progress-bar-fill animate-pulse" style={{ width: `${agent.progress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chain of Custody Audit Log */}
        <div className="glass-card panel-card">
          <div className="panel-header">
            <h4 className="panel-title">
              <ClipboardList className="panel-title-icon" />
              <span>Forensic Chain of Custody Log</span>
            </h4>
            <Link href={`/audit?case_id=${caseId}`} className="panel-link">
              <span>View Full Ledger</span>
              <ArrowRight className="panel-link-icon" />
            </Link>
          </div>

          <div className="audit-list">
            {recentAudits.length > 0 ? (
              recentAudits.map((log) => (
                <div key={log.id} className="audit-log-item">
                  <div className="audit-log-header">
                    <span className="audit-log-action">{log.action}</span>
                    <span className="audit-log-time">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="audit-log-details">{log.details}</p>
                  <div className="audit-log-meta">
                    <span>User: {log.user}</span>
                    {log.sha256_hash && (
                      <>
                        <span>•</span>
                        <span className="audit-log-hash">Hash: {log.sha256_hash.substring(0, 16)}...</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "3rem 0" }}>
                <p className="loader-text">No forensic logs registered. Upload files to generate log histories.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
