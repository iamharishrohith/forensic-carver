"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Search, 
  ShieldCheck, 
  Calendar, 
  User, 
  Check, 
  Copy,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";
import "./audit.css";

export default function AuditLogs() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("All");

  useEffect(() => {
    setLoading(true);
    api.getAudit(caseId)
      .then((data) => setLogs(data))
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.sha256_hash && log.sha256_hash.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === "All" || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action) => {
    switch (action) {
      case "UPLOAD": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "AI_DECISION": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "APPROVE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "REJECT": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "CREATE_CASE": return "bg-zinc-800 text-zinc-300 border-zinc-700";
      default: return "bg-zinc-800 text-zinc-500 border-zinc-700";
    }
  };

  return (
    <div className="audit-container">
      {/* Title */}
      <div>
        <span className="sidebar-label">Accountability Ledger</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Chain of Custody Logs</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Forensic immutable audit trail logging user uploads, verification hashes, and Human-in-the-loop decisions.
        </p>
      </div>

      {/* Filters and Searches */}
      <div className="glass-card p-5 filters-row">
        <div className="search-input-wrapper">
          <Search className="search-input-icon" style={{ top: "0.625rem" }} />
          <input 
            type="text" 
            placeholder="Search by action text, hash identifier, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "2.25rem", width: "100%" }}
          />
        </div>

        <div className="filter-btn-group">
          {["All", "UPLOAD", "AI_DECISION", "APPROVE", "REJECT"].map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              style={{
                fontSize: "0.75rem",
                padding: "0.375rem 0.875rem",
                borderRadius: "0.5rem",
                border: selectedAction === act ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid var(--border)",
                background: selectedAction === act ? "rgba(139, 92, 246, 0.15)" : "#09090b",
                color: selectedAction === act ? "#a78bfa" : "var(--muted-light)",
                fontWeight: selectedAction === act ? "600" : "500",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}
            >
              {act === "All" ? "All Actions" : act}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Log Items list */}
      <div className="inspector-section">
        {loading ? (
          <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "6rem 0" }}>
            <div className="loader-content">
              <div className="loader-spinner"></div>
              <p className="loader-text">Validating chain of custody checksums...</p>
            </div>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="glass-card table-card">
            <div className="table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Integrity Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: "var(--muted-light)", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                        <span className="event-source">
                          <Calendar style={{ height: "0.875rem", width: "0.875rem", color: "var(--muted)" }} />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </span>
                      </td>
                      <td style={{ fontWeight: "500", color: "#ffffff" }}>
                        <span className="event-source">
                          <User style={{ height: "0.875rem", width: "0.875rem", color: "var(--primary)" }} />
                          <span>{log.user}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "10px", fontFamily: "monospace", fontWeight: "700" }} className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted-light)", maxWidth: "320px", lineHeight: "1.5" }}>
                        {log.details}
                      </td>
                      <td>
                        {log.sha256_hash ? (
                          <div className="event-source" style={{ fontFamily: "monospace" }}>
                            <ShieldCheck className="text-emerald-400" style={{ height: "1rem", width: "1rem", flexShrink: 0 }} />
                            <span className="text-zinc-400" style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.sha256_hash}>
                              {log.sha256_hash.substring(0, 12)}...
                            </span>
                            <button
                              onClick={() => handleCopy(log.sha256_hash, log.id)}
                              style={{ color: "var(--muted)", padding: "0.25rem" }}
                              title="Copy SHA-256 Checksum"
                            >
                              {copiedId === log.id ? (
                                <Check className="text-emerald-400" style={{ height: "0.75rem", width: "0.75rem" }} />
                              ) : (
                                <Copy style={{ height: "0.75rem", width: "0.75rem" }} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic", fontFamily: "monospace" }}>No payload hash</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-timeline-placeholder">
            <AlertTriangle className="text-zinc-600 mb-2" style={{ height: "2.5rem", width: "2.5rem", margin: "0 auto" }} />
            <p className="loader-text">No forensic logs found matching filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
