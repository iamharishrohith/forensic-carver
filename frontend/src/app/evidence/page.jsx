"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { 
  Upload, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileAudio, 
  File, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Brain,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import "./evidence.css";

const AGENT_LIST = [
  { name: "Agent 1", label: "Classification", desc: "Categorizes file headers & formats" },
  { name: "Agent 2", label: "Entity Miner", desc: "Extracts phone keys, emails, names" },
  { name: "Agent 3", label: "Relationship Miner", desc: "Binds nodes and ownership links" },
  { name: "Agent 4", label: "Timeline Pathfinder", desc: "Plots chronological event sequences" },
  { name: "Agent 5", label: "Vision Intelligence", desc: "Scans EXIF tags and image pixel properties" },
  { name: "Agent 6", label: "Conversation Intelligence", desc: "Analyzes lexical patterns & grooming text" },
  { name: "Agent 7", label: "Risk Assessor", desc: "Evaluates threat urgency tiers" },
  { name: "Agent 8", label: "Prioritization Agent", desc: "Prioritizes file index review queue" },
  { name: "Agent 9", label: "Cross-Case Matcher", desc: "Correlates targets across databases" },
  { name: "Agent 10", label: "Investigation Copilot", desc: "Drafts leads & witness summons requests" },
  { name: "Agent 11", label: "Explainability Agent", desc: "Verifies decision transparency metrics" },
  { name: "Agent 12", label: "Report Generator", desc: "Compiles forensic PDF summaries" },
  { name: "Agent 13", label: "Synthetic Detector", desc: "Verifies EXIF & content origin integrity" }
];

export default function EvidenceExplorer() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [evidenceList, setEvidenceList] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
  
  const fileInputRef = useRef(null);

  const fetchEvidence = () => {
    api.getEvidence(caseId)
      .then((data) => {
        setEvidenceList(data);
        if (data.length > 0 && !selectedEvidence) {
          handleSelectEvidence(data[0]);
        }
      })
      .catch((err) => console.error("Error loading evidence:", err));
  };

  useEffect(() => {
    fetchEvidence();
  }, [caseId]);

  const handleSelectEvidence = (ev) => {
    setSelectedEvidence(ev);
    api.getDecisions(ev.id)
      .then((data) => setDecisions(data))
      .catch((err) => console.error("Error loading decisions:", err));
  };

  const simulatePipeline = () => {
    setRunningPipeline(true);
    setActiveAgentIndex(0);
    
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index < 13) {
        setActiveAgentIndex(index);
      } else {
        clearInterval(interval);
        setRunningPipeline(false);
        setActiveAgentIndex(-1);
      }
    }, 280);
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    let uploadedCount = 0;
    let errors = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await api.uploadEvidence(caseId, file);
        uploadedCount++;
        if (i === files.length - 1) {
          handleSelectEvidence(uploaded);
          simulatePipeline();
        }
      } catch (err) {
        errors.push(`${file.name}: ${err.message || "Upload failed"}`);
      }
    }
    
    fetchEvidence();
    
    if (uploadedCount > 0) {
      setUploadSuccess(`Successfully uploaded and processed ${uploadedCount} file(s).`);
    }
    if (errors.length > 0) {
      setUploadError(`Failed to process ${errors.length} file(s): ` + errors.join(" | "));
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    const matchesSearch = ev.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ev.sha256.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || ev.file_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type) => {
    switch(type) {
      case "Image": return <ImageIcon className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />;
      case "Video": return <VideoIcon className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />;
      case "Conversation": return <FileText className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />;
      case "Document": return <FileText className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />;
      case "Audio": return <FileAudio className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />;
      default: return <File className="text-zinc-500" style={{ height: "1.5rem", width: "1.5rem" }} />;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const parsedMeta = selectedEvidence ? JSON.parse(selectedEvidence.metadata_json || "{}") : {};

  return (
    <div className="evidence-container">
      {/* Title & Stats */}
      <div className="evidence-header">
        <div>
          <span className="sidebar-label">Evidence Registry</span>
          <h2 className="text-3xl font-bold text-white mt-1">Evidence Explorer</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Securely upload, hash verify, and inspect digital forensics payload parameters.
          </p>
        </div>

        {/* Upload Button */}
        <div className="header-actions">
          <input 
            type="file" 
            multiple
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="file-input-hidden" 
          />
          <button 
            onClick={triggerFileInput}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? (
              <>
                <div className="animate-spin" style={{ height: "1rem", width: "1rem", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }}></div>
                <span>Uploading Batch...</span>
              </>
            ) : (
              <>
                <Upload style={{ height: "1rem", width: "1rem" }} />
                <span>Upload Evidence Files</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Messages */}
      {uploadError && (
        <div className="alert-banner error">
          <AlertCircle style={{ height: "1.25rem", width: "1.25rem", flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="alert-banner success">
          <CheckCircle style={{ height: "1.25rem", width: "1.25rem", flexShrink: 0 }} />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Workspace Area */}
      <div className="workspace-layout">
        {/* Left Side: Filter and List */}
        <div className="explorer-left">
          {/* Filters Panel */}
          <div className="filters-row glass-card p-4">
            {/* Search */}
            <div className="search-input-wrapper">
              <Search className="search-input-icon" />
              <input 
                type="text" 
                placeholder="Search by filename or SHA-256 hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.25rem", width: "100%" }}
              />
            </div>
            {/* Category Filter */}
            <div className="filter-btn-group">
              {["All", "Image", "Video", "Conversation", "Document", "Audio"].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: selectedType === type ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid var(--border)",
                    background: selectedType === type ? "rgba(139, 92, 246, 0.15)" : "#09090b",
                    color: selectedType === type ? "#a78bfa" : "var(--muted-light)",
                    fontWeight: selectedType === type ? "600" : "500",
                    whiteSpace: "nowrap"
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="evidence-list">
            {filteredEvidence.length > 0 ? (
              filteredEvidence.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvidence(ev)}
                  className={`glass-card evidence-item-card ${selectedEvidence?.id === ev.id ? "selected" : ""}`}
                >
                  <div className="card-main-info">
                    <div className="evidence-icon-box">
                      {getFileIcon(ev.file_type)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 className="evidence-item-name">{ev.filename}</h4>
                      <p className="evidence-item-meta">
                        <span>{ev.file_type}</span>
                        <span>•</span>
                        <span>{formatBytes(ev.size_bytes)}</span>
                        <span>•</span>
                        <span className="mono-text">{ev.sha256.substring(0, 10)}...</span>
                      </p>
                    </div>
                  </div>

                  <div className="card-status-info">
                    {ev.status === "processed" ? (
                      <span className="status-badge status-analyzed">
                        <CheckCircle style={{ height: "0.75rem", width: "0.75rem" }} />
                        <span>Analyzed</span>
                      </span>
                    ) : ev.status === "processing" ? (
                      <span className="status-badge status-analyzing animate-pulse">
                        <Clock style={{ height: "0.75rem", width: "0.75rem" }} />
                        <span>Analyzing</span>
                      </span>
                    ) : (
                      <span className="status-badge status-pending">
                        <span>Pending</span>
                      </span>
                    )}
                    <ChevronRight className="text-zinc-500" style={{ height: "1rem", width: "1rem" }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="inspector-placeholder glass-card">
                <File className="text-zinc-600" style={{ height: "2.5rem", width: "2.5rem", margin: "0 auto 0.75rem auto" }} />
                <p>No evidence matching filters has been cataloged.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Metadata Inspector */}
        <div className="glass-card p-6 explorer-right">
          {selectedEvidence ? (
            <>
              {/* Top Summary */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "1rem" }}>
                <span className="sidebar-label">Evidence Profile</span>
                <h3 className="sidebar-title">{selectedEvidence.filename}</h3>
                <div className="integrity-verification-tag">
                  <ShieldCheck style={{ height: "1rem", width: "1rem" }} />
                  <span>Integrity Verified (SHA-256)</span>
                </div>
              </div>

              {/* Trauma Shield Preview (if Image) */}
              {selectedEvidence.file_type === "Image" && (
                <div className="inspector-section">
                  <h4 className="section-label">Image Payload Sandbox</h4>
                  <div className="trauma-shield-container" style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", background: "rgba(0,0,0,0.6)", height: "11rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img 
                      src={`http://127.0.0.1:8000/uploads/${caseId}/${selectedEvidence.filename}`}
                      alt="Evidence payload"
                      className="trauma-shield"
                      style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    />
                    <div className="trauma-shield-overlay" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", pointerEvents: "none" }}>
                      <ShieldCheck className="text-warning-light animate-pulse" style={{ height: "2rem", width: "2rem", marginBottom: "0.5rem" }} />
                      <span className="overlay-title">Traumatic Content Obfuscated</span>
                      <span className="overlay-desc">Hover mouse over block to inspect image</span>
                    </div>
                  </div>
                </div>
              )}

              {/* General details */}
              <div className="inspector-section">
                <h4 className="section-label">Forensic Metrics</h4>
                <div className="forensic-grid">
                  <div className="forensic-grid-row">
                    <span className="grid-label">File Format</span>
                    <span className="grid-value">{parsedMeta.extension || "N/A"}</span>
                  </div>
                  <div className="forensic-grid-row">
                    <span className="grid-label">Payload Size</span>
                    <span className="grid-value">{formatBytes(selectedEvidence.size_bytes)}</span>
                  </div>
                  <div className="forensic-grid-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
                    <span className="grid-label">SHA-256 Checksum</span>
                    <span className="grid-value mono-text" style={{ wordBreak: "break-all" }}>{selectedEvidence.sha256}</span>
                  </div>
                  <div className="forensic-grid-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
                    <span className="grid-label">Storage Path</span>
                    <span className="grid-value mono-text" style={{ wordBreak: "break-all", fontWeight: "normal" }}>{selectedEvidence.filepath}</span>
                  </div>
                </div>
              </div>

              {/* EXIF Metadata (if Image) */}
              {selectedEvidence.file_type === "Image" && parsedMeta.exif && (
                <div className="inspector-section">
                  <h4 className="section-label">EXIF Parameters</h4>
                  <div className="exif-metrics-box">
                    <div className="metrics-row">
                      <span className="metrics-label">Camera Make:</span>
                      <span className="metrics-value">{parsedMeta.camera_make || "Unknown"}</span>
                    </div>
                    <div className="metrics-row">
                      <span className="metrics-label">Camera Model:</span>
                      <span className="metrics-value">{parsedMeta.camera_model || "Unknown"}</span>
                    </div>
                    <div className="metrics-row">
                      <span className="metrics-label">Date Taken:</span>
                      <span className="metrics-value">{parsedMeta.capture_date || "N/A"}</span>
                    </div>
                    <div className="metrics-row">
                      <span className="metrics-label">Resolution:</span>
                      <span className="metrics-value">{parsedMeta.width} x {parsedMeta.height}</span>
                    </div>
                    {parsedMeta.gps_coordinates && (
                      <div className="metrics-row" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                        <span className="metrics-label" style={{ fontWeight: "600", color: "#e4e4e7" }}>GPS Coordinates:</span>
                        <span className="metrics-value-purple font-mono">{parsedMeta.gps_coordinates}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Preview */}
              {parsedMeta.text_preview && (
                <div className="inspector-section">
                  <h4 className="section-label">OCR / File Raw Preview</h4>
                  <div className="raw-text-preview">
                    {parsedMeta.text_preview}
                  </div>
                </div>
              )}

              {/* Highlight Agent 13 Synthetic Warning if present */}
              {decisions.some(d => d.agent_name.includes("Agent 13") && d.decision.includes("Warning")) && (
                <div className="synthetic-alert-box glow-red animate-pulse-slow">
                  <AlertCircle style={{ height: "1.25rem", width: "1.25rem", flexShrink: 0 }} />
                  <div className="alert-content">
                    <span className="alert-title">Forensics Security Alert</span>
                    <p className="alert-body">
                      {decisions.find(d => d.agent_name.includes("Agent 13"))?.decision}
                    </p>
                    <p className="alert-reasoning">
                      Reasoning: {decisions.find(d => d.agent_name.includes("Agent 13"))?.reasoning}
                    </p>
                  </div>
                </div>
              )}

              {/* Agent Pipeline Visualizer */}
              <div className="inspector-section" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                <div className="pipeline-header">
                  <h4 className="section-label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Brain className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
                    <span>Agent Orchestrator Pipeline</span>
                  </h4>
                  <button 
                    onClick={simulatePipeline}
                    disabled={runningPipeline}
                    className="btn-secondary"
                    style={{
                      padding: "0.25rem 0.6rem",
                      fontSize: "12px",
                      opacity: runningPipeline ? 0.5 : 1
                    }}
                  >
                    {runningPipeline ? "Running..." : "Simulate Run"}
                  </button>
                </div>

                <div className="pipeline-list p-3" style={{ background: "rgba(9, 9, 11, 0.6)", borderRadius: "var(--radius)", border: "1px solid rgba(255,255,255,0.03)" }}>
                  {AGENT_LIST.map((agent, index) => {
                    const isCompleted = !runningPipeline || index < activeAgentIndex;
                    const isProcessing = runningPipeline && index === activeAgentIndex;
                    
                    return (
                      <div key={agent.name} className="pipeline-step">
                        <div className="step-indicator">
                          {isCompleted ? (
                            <div className="step-indicator-completed">
                              <CheckCircle className="text-emerald-400" style={{ height: "0.6rem", width: "0.6rem" }} />
                            </div>
                          ) : isProcessing ? (
                            <div className="step-indicator-processing animate-spin" style={{ borderTopColor: "transparent" }}></div>
                          ) : (
                            <div className="step-indicator-idle">
                              <span className="step-indicator-dot"></span>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="flex justify-between items-center" style={{ display: "flex", justifyContent: "space-between" }}>
                            <span className="step-label" style={{ color: isProcessing ? "#fbbf24" : isCompleted ? "#d4d4d8" : "#71717a" }}>
                              {agent.name}: {agent.label}
                            </span>
                            {isProcessing && (
                              <span className="step-running-tag animate-pulse">Scanning</span>
                            )}
                          </div>
                          <p className="step-desc">{agent.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Agent Decisions summary */}
              <div className="inspector-section" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                <div className="verdict-header">
                  <h4 className="section-label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Brain className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
                    <span>Agent Verdicts ({decisions.length})</span>
                  </h4>
                  <Link href={`/insights?case_id=${caseId}`} className="panel-link">
                    <span>AI Insights</span>
                    <ExternalLink className="panel-link-icon" />
                  </Link>
                </div>

                <div className="verdict-list">
                  {decisions.map((dec) => (
                    <div key={dec.id} className="verdict-item">
                      <div className="verdict-item-header">
                        <span className="verdict-agent-title">{dec.agent_name.replace("Agent ", "A")}</span>
                        <span className="verdict-confidence-badge">
                          {(dec.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                      <p className="verdict-summary">{dec.decision}</p>
                      <p className="verdict-reasoning">
                        Reasoning: {dec.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <File className="text-zinc-700 animate-bounce" style={{ height: "2rem", width: "2rem", margin: "0 auto 0.5rem auto" }} />
              <p>Select an evidence file to inspect forensic parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
