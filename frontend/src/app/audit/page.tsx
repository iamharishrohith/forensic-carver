"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Search, 
  ShieldCheck, 
  Calendar, 
  User, 
  Check, 
  Copy,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";

export default function AuditLogs() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("All");

  useEffect(() => {
    setLoading(true);
    api.getAudit(caseId)
      .then((data) => setLogs(data))
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleCopy = (text: string, id: number) => {
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

  const getActionBadgeColor = (action: string) => {
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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Accountability Ledger</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Chain of Custody Logs</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Forensic immutable audit trail logging user uploads, verification hashes, and Human-in-the-loop decisions.
        </p>
      </div>

      {/* Filters and Searches */}
      <div className="glass-card p-5 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by action text, hash identifier, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto w-full md:w-auto">
          {["All", "UPLOAD", "AI_DECISION", "APPROVE", "REJECT"].map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all ${
                selectedAction === act
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/30 font-semibold"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
              }`}
            >
              {act === "All" ? "All Actions" : act}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Log Items list */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-24 text-center">
            <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-400 text-sm">Validating chain of custody checksums...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="glass-card rounded-xl overflow-hidden border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/40 text-xs font-mono uppercase text-zinc-500">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">Details</th>
                    <th className="p-4 font-semibold">Integrity Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/10 transition-colors">
                      <td className="p-4 font-mono text-zinc-400 whitespace-nowrap">
                        <span className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </span>
                      </td>
                      <td className="p-4 font-medium text-zinc-200">
                        <span className="flex items-center space-x-1.5">
                          <User className="h-3.5 w-3.5 text-purple-400/50" />
                          <span>{log.user}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-mono font-bold ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium max-w-xs leading-normal">
                        {log.details}
                      </td>
                      <td className="p-4">
                        {log.sha256_hash ? (
                          <div className="flex items-center space-x-2 font-mono">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-zinc-400 truncate max-w-[100px]" title={log.sha256_hash}>
                              {log.sha256_hash.substring(0, 12)}...
                            </span>
                            <button
                              onClick={() => handleCopy(log.sha256_hash, log.id)}
                              className="text-zinc-600 hover:text-zinc-400 p-1 transition-colors focus:outline-none"
                              title="Copy SHA-256 Checksum"
                            >
                              {copiedId === log.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 font-mono italic">No payload hash</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl">
            <AlertTriangle className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
            <p className="text-zinc-500 text-sm">No forensic logs found matching filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
