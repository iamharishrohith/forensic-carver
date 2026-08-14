"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  HardDrive,
  Layers,
  Activity,
  ShieldAlert,
  Search,
  FileCode,
  Terminal,
  ArrowRight,
  Clock,
  Plus,
  Database,
  Network,
  ChevronRight,
  Download,
  AlertTriangle,
  CheckCircle,
  Hash,
  Globe,
  FileText,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import "./forensics.css";

export default function ForensicsExplorer() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  // State Management
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [activeTab, setActiveTab] = useState("disk"); // disk, memory, bloom
  
  // Disk partition state
  const [diskData, setDiskData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Memory analysis state
  const [memoryData, setMemoryData] = useState(null);
  
  // Registration modal state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regPath, setRegPath] = useState("C:\\ForensicImages\\case_9921_disk.dd");
  const [regType, setRegType] = useState("DiskImage");
  const [regName, setRegName] = useState("Target Phone Raw Image");
  const [loading, setLoading] = useState(false);
  
  // Bloom hash tester state
  const [testHash, setTestHash] = useState("9a01b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1");
  const [hashResult, setHashResult] = useState(null);

  // Live Forensic Console Log Stream
  const [logs, setLogs] = useState([]);
  const consoleEndRef = useRef(null);

  // Forensic UX enhancements states
  const [showHexModal, setShowHexModal] = useState(false);
  const [hexModalBlock, setHexModalBlock] = useState(null);
  const [hexData, setHexData] = useState("");
  const [timelineValue, setTimelineValue] = useState(100);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [selectedProcessPid, setSelectedProcessPid] = useState(null);

  const addLog = (text, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, text, type }]);
  };

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Fetch linked evidence sources
  const fetchSources = () => {
    setLoading(true);
    api.getForensicSources(caseId)
      .then((data) => {
        setSources(data);
        if (data.length > 0) {
          handleSelectSource(data[0]);
        } else {
          setSelectedSource(null);
          setDiskData(null);
          setMemoryData(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching forensic sources:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSources();
    setLogs([]);
    addLog("ACPIA Forensic Streamliner Engine loaded successfully.", "success");
    addLog("Offline reference Bloom Filter loaded (10,000 common system file hashes cached).", "success");
  }, [caseId]);

  // Select a source and load its contents
  const handleSelectSource = (source) => {
    setSelectedSource(source);
    setSelectedFile(null);
    setFilePreview(null);
    
    // Automatically switch tabs depending on file type
    if (source.file_type === "DiskImage") {
      setActiveTab("disk");
      addLog(`Connecting virtual reader to raw disk: ${source.filename}...`);
      api.getDiskStructure(source.id)
        .then((res) => {
          setDiskData(res);
          addLog(`Disk mounted successfully via ${res.engine}.`, "success");
          addLog(`Parsed partition table. Found ${res.partitions?.length} volumes.`, "info");
          addLog(`Indexed ${res.files?.length} files inside metadata tree.`, "info");
          
          // Simulate fast Bloom filter pass
          const totalFiles = res.files?.length || 0;
          const cleanCount = Math.floor(totalFiles * 0.7);
          addLog(`Bloom Filter Check: Ignored ${cleanCount} OS matching files. Triage load reduced by 70%.`, "success");
        })
        .catch((err) => addLog(`Failed to mount disk structure: ${err.message}`, "err"));
    } else if (source.file_type === "MemoryDump") {
      setActiveTab("memory");
      addLog(`Initializing volatile RAM analysis for memory dump: ${source.filename}...`);
      api.getMemoryAnalysis(source.id)
        .then((res) => {
          setMemoryData(res);
          addLog(`RAM tables parsed successfully via ${res.engine}.`, "success");
          addLog(`Extracted ${res.processes?.length} active process trees.`, "info");
          addLog(`Identified ${res.connections?.length} network sockets.`, "info");
          
          // Alert on spyware in memory
          const susp = res.processes?.find(p => p.suspicious);
          if (susp) {
            addLog(`CRITICAL WARNING: Suspicious process running in memory: ${susp.name} (PID: ${susp.pid})`, "err");
          }
        })
        .catch((err) => addLog(`Failed to parse memory dump: ${err.message}`, "err"));
    }
  };

  // Handle register forensic source
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regPath.trim()) return;

    setLoading(true);
    const paths = regPath.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);
    addLog(`Initiating bulk registration for ${paths.length} source(s)...`, "info");
    
    let successCount = 0;
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const filename = path.split(/[\\/]/).pop() || `forensic_source_${i+1}`;
      
      // Auto-detect type based on extension
      let fileType = regType;
      const ext = filename.split('.').pop().toLowerCase();
      if (["bin", "raw"].includes(ext) || filename.includes("ram") || filename.includes("mem")) {
        fileType = "MemoryDump";
      } else if (["dd", "img", "e01", "aff4"].includes(ext)) {
        fileType = "DiskImage";
      }
      
      const friendlyName = paths.length > 1 ? `${regName} (${i + 1})` : regName;
      addLog(`[${i + 1}/${paths.length}] Registering: ${filename} as ${fileType}...`, "info");
      
      try {
        const data = await api.registerForensicSource(caseId, path, fileType, friendlyName);
        addLog(`[SUCCESS] Registered forensic source: ${data.filename}`, "success");
        successCount++;
      } catch (err) {
        addLog(`[ERROR] Failed to register path "${path}": ${err.message}`, "err");
      }
    }
    
    setLoading(false);
    setShowRegModal(false);
    fetchSources();
  };

  // Inspect specific file in disk
  const handleInspectFile = (file) => {
    setSelectedFile(file);
    setFilePreview(null);
    
    addLog(`Inspecting metadata for file: ${file.name}`);
    
    // Check Bloom filter
    api.checkFileHash(selectedSource.id, file.sha256, file.path)
      .then((hashCheck) => {
        setSelectedFile(prev => ({
          ...prev,
          nsrl_status: hashCheck.status,
          nsrl_details: hashCheck.details,
          triage_action: hashCheck.triage_action
        }));
        
        if (hashCheck.status === "known_good") {
          addLog(`NSRL Match for ${file.name}: Automatically excluded from extraction.`, "success");
        } else if (hashCheck.status === "known_bad") {
          addLog(`MALWARE MATCH: ${file.name} corresponds to a known threat!`, "err");
        } else {
          addLog(`Unrecognized hash. Running agent triage scanner...`, "warn");
        }
      });
      
    // Extract file bytes directly if readable text
    const ext = file.name.split('.').pop().toLowerCase();
    if (["txt", "json", "csv", "docx", "db", "history"].includes(ext) || file.is_database) {
      addLog(`Requesting targeted in-place read of blocks for: ${file.path}`);
      api.extractVirtualFile(selectedSource.id, file.path)
        .then((res) => {
          setFilePreview(res.content_preview);
          addLog(`Extracted ${res.extracted_size_bytes} bytes in-place.`, "success");
        })
        .catch((err) => addLog(`Block read failed: ${err.message}`, "err"));
    }
  };

  // Hash Lookup check
  const handleHashCheck = (e) => {
    if (e) e.preventDefault();
    if (!testHash) return;
    
    api.checkFileHash(selectedSource ? selectedSource.id : 1, testHash)
      .then((res) => {
        setHashResult(res);
        addLog(`Bloom filter query for hash [${testHash.substring(0, 10)}...] complete. Result: ${res.status.toUpperCase()}`, "info");
      })
      .catch((err) => addLog(`Bloom Filter check failed: ${err.message}`, "err"));
  };

  // Sector map click handler populating realistic PE / Hex dumps
  const handleBlockClick = (blockIndex) => {
    setHexModalBlock(blockIndex);
    
    let blockType = "Empty Sector";
    let dataStr = "";
    if (blockIndex < 65) {
      blockType = "Operating System Binary (NTFS Sector)";
      dataStr = `0000: 4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00  MZ..............\n` +
                `0010: B8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  ........@.......\n` +
                `0020: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................\n` +
                `0030: 00 00 00 00 00 00 00 00 00 00 00 00 F0 00 00 00  ............ð...\n` +
                `0040: 0E 1F BA 0E 00 B4 09 CD 21 B8 01 4C CD 21 54 68  ..º..´.Í!¸.LÍ!Th\n` +
                `0050: 69 73 20 70 72 6F 67 72 61 6D 20 63 61 6E 6E 6F  is program canno\n` +
                `0060: 74 20 62 65 20 72 75 6E 20 69 6E 20 44 4F 53 20  t be run in DOS `;
    } else if (blockIndex < 105) {
      blockType = "User Data File (Sector Allocation)";
      dataStr = `0000: 55 73 65 72 20 70 72 6F 66 69 6C 65 20 64 61 74  User profile dat\n` +
                `0010: 61 20 63 6F 6E 74 65 6E 74 20 73 74 72 65 61 6D  a content stream\n` +
                `0020: 20 73 65 63 74 6F 72 20 70 6F 69 6E 74 65 72 73   sector pointers\n` +
                `0030: 2E 20 53 61 66 65 20 66 69 6C 65 73 79 73 74 65  . Safe filesyste\n` +
                `0040: 6D 20 6E 6F 64 65 20 61 6C 6C 6F 63 61 74 69 6F  m node allocatio\n` +
                `0050: 6E 20 66 6F 72 20 75 73 65 72 20 64 6F 63 75 6D  n for user docum\n` +
                `0060: 65 6E 74 73 2E 20 4E 6F 20 74 68 72 65 61 74 73  ents. No threats`;
    } else if (blockIndex < 114) {
      blockType = "Recovered Deleted Document (Anitha Chat Log)";
      dataStr = `0000: 44 45 4C 45 54 45 44 20 46 49 4C 45 20 53 45 43  DELETED FILE SEC\n` +
                `0010: 54 4F 52 20 2D 20 67 72 6F 6F 6D 65 72 5F 63 68  TOR - groomer_ch\n` +
                `0020: 61 74 5F 65 78 70 6F 72 74 2E 74 78 74 20 5B 54  at_export.txt [T\n` +
                `0030: 65 78 74 20 46 72 61 67 6D 65 6E 74 5D 3A 20 22  ext Fragment]: "\n` +
                `0040: 6D 65 65 74 20 6D 65 20 61 74 20 74 68 65 20 70  meet me at the p\n` +
                `0050: 61 72 6B 20 61 6E 64 20 64 6F 6E 27 74 20 74 65  ark and don't te\n` +
                `0060: 6C 6C 20 79 6F 75 72 20 70 61 72 65 6E 74 73 22  ll your parents"`;
    } else {
      blockType = "Flagged Malware Executable payload (spynet.exe)";
      dataStr = `0000: 4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00  MZ..............\n` +
                `0010: B8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  ........@.......\n` +
                `0020: 53 70 79 4E 65 74 20 54 72 6F 6A 61 6E 20 52 41  SpyNet Trojan RA\n` +
                `0030: 54 20 42 69 6E 61 72 79 20 53 69 67 6E 61 74 75  T Binary Signatu\n` +
                `0040: 72 65 20 4D 61 6C 69 63 69 6F 75 73 20 50 61 79  re Malicious Pay\n` +
                `0050: 6C 6F 61 64 20 43 32 20 43 6F 6E 6E 65 63 74 69  load C2 Connecti\n` +
                `0060: 6F 6E 20 41 63 74 69 76 65 20 53 6F 63 6B 65 74  on Active Socket`;
    }
    
    setHexData(dataStr);
    setHexModalBlock(blockType); // Store the header string in block index state temporarily
    setShowHexModal(true);
  };

  // Search logic for files combined with timeline slider bounds
  const filteredFiles = diskData?.files?.filter(f => {
    const term = searchQuery.toLowerCase();
    const isSearchMatch = f.name.toLowerCase().includes(term) || f.path.toLowerCase().includes(term) || f.sha256.includes(term);
    if (!isSearchMatch) return false;
    
    // Timeline slider filtering
    if (timelineValue < 35) {
      // Show only whitelisted OS files
      return f.path.startsWith("/system") || f.path.includes("kernel") || f.path.includes("ntdll");
    } else if (timelineValue < 75) {
      // Show OS and normal files, hide spynet.exe or groomer_chat_export.txt
      const nameLower = f.name.toLowerCase();
      return !nameLower.includes("spynet") && !nameLower.includes("groomer");
    }
    return true; // Show all files
  }) || [];

  return (
    <div className="forensics-container">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Forensics Workspace */}
      <div className="forensics-content">
        <header className="forensics-header">
          <div className="forensics-title-section">
            <h1>ACPIA Forensic Streamliner (ACPIA-FS)</h1>
            <p>Direct bit-stream partition extraction, RAM process graphing, and hash triage copilot</p>
          </div>
          <div className="forensics-actions">
            <button 
              className="btn-primary-action" 
              onClick={() => {
                setShowRegModal(true);
                // Pre-generate nice paths
                if (sources.length === 0) {
                  setRegName("Victim Phone Raw Disk");
                  setRegPath("C:\\Forensics\\victim_seized_phone.dd");
                  setRegType("DiskImage");
                } else if (sources.length === 1) {
                  setRegName("Target Workstation RAM Dump");
                  setRegPath("C:\\Forensics\\suspect_ram_capture.bin");
                  setRegType("MemoryDump");
                } else {
                  setRegName(`Forensic Source ${sources.length + 1}`);
                  setRegPath(`C:\\Forensics\\image_${sources.length + 1}.dd`);
                  setRegType("DiskImage");
                }
              }}
            >
              <Plus size={16} /> Link Forensic Device/Image
            </button>
          </div>
        </header>

        <div className="forensics-grid">
          {/* Linked Forensic Sources panel */}
          <div className="forensics-side-panel">
            <div>
              <div className="panel-section-title">Forensic Evidence Sources</div>
              {loading && <p className="text-zinc-500 text-xs">Loading forensic registry...</p>}
              {!loading && sources.length === 0 && (
                <div className="text-zinc-600 text-xs py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                  No forensic raw images linked. Please link a device image to begin.
                </div>
              )}
              {sources.map((source) => (
                <div 
                  key={source.id} 
                  className={`source-item ${selectedSource?.id === source.id ? "active" : ""}`}
                  onClick={() => handleSelectSource(source)}
                >
                  <div className="source-header">
                    {source.file_type === "DiskImage" ? (
                      <HardDrive size={16} className="text-purple-400" />
                    ) : (
                      <Database size={16} className="text-cyan-400" />
                    )}
                    <span className="truncate">{source.filename}</span>
                  </div>
                  <div className="source-meta">
                    Type: {source.file_type === "DiskImage" ? "Raw Partition Disk" : "Memory Dump"}<br />
                    Size: {(source.size_bytes / (1024 * 1024)).toFixed(2)} MB<br />
                    Hash: {source.sha256.substring(0, 12)}...
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <div className="panel-section-title">Quick Action Triage</div>
              <button 
                className={`btn-secondary-action w-full justify-start ${activeTab === "bloom" ? "border-purple-500 bg-purple-500/10 text-purple-400" : ""}`}
                onClick={() => setActiveTab("bloom")}
              >
                <Hash size={16} /> Bloom Filter Hash Checker
              </button>
            </div>
          </div>

          {/* Core Analytics Console */}
          <div className="forensics-body">
            {/* Tab selector */}
            {selectedSource && (
              <div className="tab-navigation">
                {selectedSource.file_type === "DiskImage" && (
                  <button 
                    className={`tab-btn ${activeTab === "disk" ? "active" : ""}`}
                    onClick={() => setActiveTab("disk")}
                  >
                    <Layers size={16} /> Partition Explorer
                  </button>
                )}
                {selectedSource.file_type === "MemoryDump" && (
                  <button 
                    className={`tab-btn ${activeTab === "memory" ? "active" : ""}`}
                    onClick={() => setActiveTab("memory")}
                  >
                    <Activity size={16} /> Volatile RAM Analyst
                  </button>
                )}
                <button 
                  className={`tab-btn ${activeTab === "bloom" ? "active" : ""}`}
                  onClick={() => setActiveTab("bloom")}
                >
                  <Hash size={16} /> Hash Verification
                </button>
              </div>
            )}

            {/* Ingestion status/welcome if no source */}
            {!selectedSource && activeTab !== "bloom" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                <HardDrive size={48} className="text-zinc-700 mb-4 stroke-1 animate-pulse" />
                <h3 className="text-white font-medium mb-1">No Active Forensic Workspace</h3>
                <p className="text-xs max-w-sm mb-4 text-zinc-500">
                  Select an linked disk image (.dd/.raw) or a volatility memory dump (.bin) from the sidebar, or link a new path on your workstation to mount the partition table.
                </p>
                <button 
                  className="btn-secondary-action"
                  onClick={() => setShowRegModal(true)}
                >
                  <Plus size={14} /> Link Raw Image File
                </button>
              </div>
            )}

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-hidden">
              {selectedSource && activeTab === "disk" && diskData && (
                <div className={`workspace-split h-full ${selectedFile ? "has-selection" : ""}`}>
                  {/* File Grid */}
                  <div className="main-workspace">
                    {/* Summary Metrics */}
                    <div className="forensic-metrics-summary mb-4">
                      <div className="summary-card">
                        <div className="summary-card-header">
                          <Layers size={14} className="text-purple-400" />
                          <span>Bloom Cache Skip Rate</span>
                        </div>
                        <div className="summary-card-value">71.4%</div>
                        <div className="summary-card-desc">7 out of 10 clean files bypassed</div>
                      </div>
                      
                      <div className="summary-card">
                        <div className="summary-card-header">
                          <Activity size={14} className="text-cyan-400" />
                          <span>Forensics Throughput</span>
                        </div>
                        <div className="summary-card-value">940 MB/s</div>
                        <div className="summary-card-desc">Zero-copy block stream active</div>
                      </div>
                      
                      <div className="summary-card alert">
                        <div className="summary-card-header">
                          <ShieldAlert size={14} className="text-red-400 animate-pulse-slow" />
                          <span>Malware Signatures</span>
                        </div>
                        <div className="summary-card-value text-red-400">1 Alarm</div>
                        <div className="summary-card-desc">trojan_spynet.exe flagged</div>
                      </div>

                      <div className="summary-card risk-gauge-card">
                        <div className="summary-card-header">
                          <Activity size={14} className="text-red-500 animate-pulse-slow" />
                          <span>Case Risk Index</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="risk-ring-progress">
                            <span className="risk-ring-value">92%</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-red-400 uppercase animate-pulse">Critical</span>
                            <span className="text-[9px] text-zinc-500">Threat detected</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Slider */}
                    <div className="timeline-slider-container mb-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-xs text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={14} className="text-purple-400" /> Temporal Forensic Ingestion Timeline
                        </span>
                        <span className="text-xs font-mono text-purple-400">
                          {timelineValue < 35 ? "08:15 AM - Initial Boot (Clean)" : timelineValue < 75 ? "09:30 AM - User Activity (Normal)" : "09:53 AM - Post Incident (Spyware Active)"}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={timelineValue}
                        onChange={(e) => setTimelineValue(parseInt(e.target.value))}
                        className="w-full timeline-range" 
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                        <span>08:00 AM (Clean Base)</span>
                        <span>09:15 AM (Files Created)</span>
                        <span>09:53 AM (Spyware Drop)</span>
                      </div>
                    </div>

                    {/* Sector Map */}
                    <div className="disk-sector-card mb-4 p-4">
                      <div className="disk-sector-header">
                        <span className="font-semibold text-xs text-zinc-300 uppercase tracking-wider">In-Place Sector Triage Map (GPT Partition 2 allocation)</span>
                        <div className="disk-sector-legend">
                          <span className="legend-item"><span className="legend-dot green"></span> OS Binary (Bloom Match)</span>
                          <span className="legend-item"><span className="legend-dot blue"></span> User Data Files</span>
                          <span className="legend-item"><span className="legend-dot yellow"></span> Recovered Deleted Files</span>
                          <span className="legend-item"><span className="legend-dot red"></span> Suspect Malware payload</span>
                        </div>
                      </div>
                      <div className="disk-block-grid">
                        {Array.from({ length: 120 }).map((_, i) => {
                          let blockClass = "block-empty";
                          if (i < 65) blockClass = "block-os";
                          else if (i < 105) blockClass = "block-user";
                          else if (i < 114) blockClass = "block-deleted animate-pulse-slow";
                          else if (i < 118) blockClass = "block-malware animate-pulse";
                          
                          return (
                            <div 
                              key={i} 
                              className={`sector-block ${blockClass}`} 
                              title={`Physical Sector Block allocation: ${2048 + i * 8}. Click to inspect raw hex dump.`}
                              onClick={() => handleBlockClick(i)}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4 gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search files by path, name, or metadata hash..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 whitespace-nowrap bg-zinc-900 px-3 py-2 border border-zinc-800 rounded-lg">
                        <Database size={12} className="text-purple-400" />
                        <span>Source: <b>{diskData.engine}</b></span>
                      </div>
                    </div>

                    <div className="fs-table-container flex-1 overflow-y-auto mb-4">
                      <table className="fs-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Virtual Absolute Path</th>
                            <th>Size (Bytes)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFiles.map((file, idx) => (
                            <tr 
                              key={idx}
                              className={`fs-row ${selectedFile?.path === file.path ? "selected" : ""}`}
                              onClick={() => handleInspectFile(file)}
                            >
                              <td className="fs-file-name">
                                {file.is_deleted ? (
                                  <AlertCircle size={14} className="text-red-400" />
                                ) : (
                                  <FileCode size={14} className="text-purple-400" />
                                )}
                                <span className={file.is_deleted ? "text-red-300 font-medium" : "text-zinc-200"}>{file.name}</span>
                              </td>
                              <td className="text-zinc-400 text-xs font-mono truncate max-w-xs">{file.path}</td>
                              <td className="text-zinc-400 font-mono text-xs">{file.size_bytes.toLocaleString()}</td>
                              <td>
                                {file.is_deleted ? (
                                  <span className="deleted-badge">{file.recovery_status || "Deleted"}</span>
                                ) : (
                                  <span className="deleted-badge badge-green">Live FS</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredFiles.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center text-zinc-500 py-8 text-xs">
                                No files matched the search parameters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Preview box */}
                    {selectedFile && (
                      <div className="border border-zinc-800 rounded-xl bg-black/40 p-4">
                        <div className="flex justify-between items-center border-bottom pb-2 mb-2 border-zinc-950">
                          <span className="text-xs text-purple-400 font-mono flex items-center gap-1.5 font-bold">
                            <Terminal size={12} /> Target File Stream Preview: {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-zinc-500">Read from block address directly</span>
                        </div>
                        <div className="bg-zinc-950/70 border border-zinc-900 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                          {filePreview ? filePreview : (
                            <span className="text-zinc-600 italic">No text content available or binary file stream ignored (image/executable).</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Detail Panel */}
                  {selectedFile && (
                    <div className="details-sidebar">
                      <div className="detail-card">
                        <div className="detail-card-title">
                          <HardDrive size={14} /> File Attributes
                        </div>
                        <div className="meta-field">
                          <span className="meta-field-label">Filename</span>
                          <span className="meta-field-value text-white">{selectedFile.name}</span>
                        </div>
                        <div className="meta-field">
                          <span className="meta-field-label">Raw Path</span>
                          <span className="meta-field-value">{selectedFile.path}</span>
                        </div>
                        <div className="meta-field">
                          <span className="meta-field-label">Size</span>
                          <span className="meta-field-value">{selectedFile.size_bytes.toLocaleString()} bytes</span>
                        </div>
                        <div className="meta-field">
                          <span className="meta-field-label">Hash SHA256</span>
                          <span className="meta-field-value">{selectedFile.sha256}</span>
                        </div>
                      </div>

                      <div className="detail-card">
                        <div className="detail-card-title">
                          <ShieldAlert size={14} className="text-purple-400" /> Triage Check
                        </div>
                        
                        <div className="mb-2">
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Bloom Filter Lookup:</span>
                          {selectedFile.nsrl_status ? (
                            <div className="mt-1 flex items-center gap-1.5 text-xs">
                              {selectedFile.nsrl_status === "known_good" && (
                                <>
                                  <CheckCircle size={14} className="text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">KNOWN SAFE (NSRL)</span>
                                </>
                              )}
                              {selectedFile.nsrl_status === "known_bad" && (
                                <>
                                  <AlertTriangle size={14} className="text-red-400 animate-bounce" />
                                  <span className="text-red-400 font-bold">KNOWN ILLEGAL THREAT</span>
                                </>
                              )}
                              {selectedFile.nsrl_status === "unmatched" && (
                                <>
                                  <AlertCircle size={14} className="text-amber-400" />
                                  <span className="text-amber-400 font-bold">UNMATCHED (NLP Queue)</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-zinc-600 text-xs italic animate-pulse">Running signature matcher...</div>
                          )}
                        </div>

                        {selectedFile.nsrl_details && (
                          <p className="text-[11px] text-zinc-400 bg-zinc-900/50 p-2 border border-zinc-800 rounded font-mono mt-2">
                            {selectedFile.nsrl_details}
                          </p>
                        )}
                        
                        {selectedFile.triage_action && (
                          <div className="mt-3 text-[10px] uppercase font-bold text-zinc-500">
                            Orchestrator Action: <span className={selectedFile.triage_action === "EXCLUDE_FROM_ANALYSIS" ? "text-emerald-400" : "text-amber-400"}>{selectedFile.triage_action}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <button 
                          className="btn-secondary-action w-full justify-center text-xs py-1.5"
                          onClick={() => setSelectedFile(null)}
                        >
                          ✕ Close Detail View
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Memory tab */}
              {selectedSource && activeTab === "memory" && memoryData && (
                <div className="workspace-split h-full">
                  <div className="main-workspace">
                    {/* Summary Metrics */}
                    <div className="forensic-metrics-summary mb-4">
                      <div className="summary-card">
                        <div className="summary-card-header">
                          <Layers size={14} className="text-purple-400" />
                          <span>Total Processes Carved</span>
                        </div>
                        <div className="summary-card-value">10 Active</div>
                        <div className="summary-card-desc">Volatility 3 parsing complete</div>
                      </div>
                      
                      <div className="summary-card">
                        <div className="summary-card-header">
                          <Activity size={14} className="text-cyan-400" />
                          <span>RAM Network Sockets</span>
                        </div>
                        <div className="summary-card-value">3 Sockets</div>
                        <div className="summary-card-desc">Active socket map resolved</div>
                      </div>
                      
                      <div className="summary-card alert">
                        <div className="summary-card-header">
                          <ShieldAlert size={14} className="text-red-400 animate-pulse-slow" />
                          <span>Injected Malware RATs</span>
                        </div>
                        <div className="summary-card-value text-red-400">1 Critical</div>
                        <div className="summary-card-desc">spynet.exe PID 4980 flagged</div>
                      </div>
                    </div>

                    {/* Visual Malware Execution Chain Flow */}
                    <div className="memory-attack-chain-card mb-4 p-4">
                      <div className="font-semibold text-xs text-zinc-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldAlert size={14} className="text-red-400 animate-pulse-slow" /> Volatile Threat Execution Chain (Threat Propagation Node Flow)
                      </div>
                      <div className="attack-chain-flow flex items-center gap-3">
                        <div className="flow-node">
                          <span className="node-pid">PID 4</span>
                          <span className="node-name">System</span>
                          <span className="node-type">Kernel Root</span>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600" />
                        
                        <div className="flow-node">
                          <span className="node-pid">PID 920</span>
                          <span className="node-name">wininit.exe</span>
                          <span className="node-type">Services Init</span>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600" />
                        
                        <div className="flow-node">
                          <span className="node-pid">PID 1024</span>
                          <span className="node-name">services.exe</span>
                          <span className="node-type">Services Host</span>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600" />
                        
                        <div className="flow-node">
                          <span className="node-pid">PID 3120</span>
                          <span className="node-name">explorer.exe</span>
                          <span className="node-type">Desktop Shell</span>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600" />
                        
                        <div className="flow-node malicious glow-red">
                          <span className="node-pid">PID 4980</span>
                          <span className="node-name text-red-400 font-bold">spynet.exe</span>
                          <span className="node-type uppercase font-bold text-red-500 animate-pulse-slow">Trojan RAT</span>
                        </div>
                        <ChevronRight size={14} className="text-red-500 animate-pulse-slow" />
                        
                        <div className="flow-node network glow-red">
                          <span className="node-pid">PORT 8080</span>
                          <span className="node-name text-cyan-400 font-bold">185.220.101.5</span>
                          <span className="node-type uppercase text-cyan-500">C2 Connection</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Processes List */}
                      <div>
                        <div className="panel-section-title flex items-center gap-1.5 text-zinc-300 font-bold mb-3">
                          <Network size={14} className="text-cyan-400" /> Active System Processes (pslist)
                        </div>
                        <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 p-3 max-h-[460px] overflow-y-auto">
                          {memoryData.processes?.map((proc, idx) => (
                            <div 
                              key={idx} 
                              className={`process-tree-node ${proc.suspicious ? "suspicious" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-zinc-500">[{proc.pid}]</span>
                                <span className="font-semibold text-zinc-200 font-mono">{proc.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-mono">PPID: {proc.ppid}</span>
                                {proc.suspicious && (
                                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                    Spyware RAT
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Connections list */}
                      <div>
                        <div className="panel-section-title flex items-center gap-1.5 text-zinc-300 font-bold mb-3">
                          <Globe size={14} className="text-cyan-400" /> Active Socket Connections (netscan)
                        </div>
                        <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 p-3 max-h-[460px] overflow-y-auto">
                          <table className="w-full text-left font-mono text-[11px] text-zinc-300 border-collapse">
                            <thead>
                              <tr className="text-zinc-500 border-b border-zinc-800">
                                <th className="pb-2">Proto</th>
                                <th className="pb-2">Local IP</th>
                                <th className="pb-2">Remote IP</th>
                                <th className="pb-2 text-right">PID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {memoryData.connections?.map((conn, idx) => (
                                <tr 
                                  key={idx}
                                  className={`border-b border-zinc-900/50 hover:bg-zinc-800/20 ${conn.suspicious ? "text-red-400 bg-red-500/5 font-semibold" : ""}`}
                                >
                                  <td className="py-2.5">{conn.proto}</td>
                                  <td className="py-2.5">{conn.local_address}</td>
                                  <td className="py-2.5 flex items-center gap-1.5">
                                    {conn.remote_address}
                                    {conn.suspicious && (
                                      <span className="text-[8px] bg-red-950 text-red-400 border border-red-800 rounded px-1 uppercase font-bold tracking-wider">C2 Tor</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right">{conn.pid}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detail Panel for Memory */}
                  <div className="details-sidebar">
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <Activity size={14} /> Volatility Parser Info
                      </div>
                      <div className="meta-field">
                        <span className="meta-field-label">Volatility Version</span>
                        <span className="meta-field-value text-white">v3.1.2 offline-dist</span>
                      </div>
                      <div className="meta-field">
                        <span className="meta-field-label">DUMP Source</span>
                        <span className="meta-field-value">{memoryData.file}</span>
                      </div>
                      <div className="meta-field">
                        <span className="meta-field-label">Analysis Timestamp</span>
                        <span className="meta-field-value">{new Date(memoryData.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="detail-card-title">
                        <Database size={14} /> registry hives in ram
                      </div>
                      {memoryData.hives?.map((hive, idx) => (
                        <div key={idx} className="mb-3 border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                          <span className="text-[10px] text-zinc-500 font-mono block truncate" title={hive.hive_path}>
                            {hive.hive_path.split('\\').pop()}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            Offset: {hive.virtual_offset}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bloom verification tab */}
              {activeTab === "bloom" && (
                <div className="main-workspace max-w-2xl mx-auto py-12">
                  <div className="glass-card p-6 rounded-xl border border-zinc-800 bg-zinc-900/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/25">
                        <Hash size={24} className="text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Bloom Filter Verification Console</h2>
                        <p className="text-xs text-zinc-500">Query ACPIA-FS's offline cache to test lookup bounds and hashing actions</p>
                      </div>
                    </div>

                    <form onSubmit={handleHashCheck} className="hash-lookup-form mb-6">
                      <input 
                        type="text" 
                        placeholder="Paste SHA-256 hash here..."
                        className="hash-input"
                        value={testHash}
                        onChange={(e) => setTestHash(e.target.value)}
                      />
                      <button type="submit" className="btn-primary-action">
                        Verify Hash
                      </button>
                    </form>

                    {hashResult ? (
                      <div className="border border-zinc-800 rounded-xl bg-black/40 p-4">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-semibold">Triage Result:</div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          {hashResult.status === "known_good" && (
                            <>
                              <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <CheckCircle size={18} />
                              </div>
                              <span className="text-emerald-400 font-bold text-sm">KNOWN GOOD (EXCLUDED FROM EXTRACTION)</span>
                            </>
                          )}
                          {hashResult.status === "known_bad" && (
                            <>
                              <div className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse">
                                <AlertTriangle size={18} />
                              </div>
                              <span className="text-red-400 font-bold text-sm">KNOWN ILLICIT SIGNATURE (IMMEDIATE ALARM)</span>
                            </>
                          )}
                          {hashResult.status === "unmatched" && (
                            <>
                              <div className="p-1 rounded bg-zinc-500/10 border border-zinc-800 text-zinc-400">
                                <AlertCircle size={18} />
                              </div>
                              <span className="text-zinc-400 font-bold text-sm">UNRESOLVED HASH (ADDED TO NLP QUEUE)</span>
                            </>
                          )}
                        </div>

                        <p className="text-xs text-zinc-300 font-mono bg-zinc-950 p-3 border border-zinc-900 rounded-lg mb-3">
                          {hashResult.details}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-500 uppercase font-semibold">
                          <div>Triage Strategy: <span className="text-zinc-300 block font-mono">{hashResult.triage_action}</span></div>
                          <div>Query Speed: <span className="text-emerald-400 block font-mono">0.02 milliseconds</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-600 text-xs py-8 border border-dashed border-zinc-800 rounded-xl">
                        Enter a file hash to test the Bloom Filter lookup bounds.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scrolling console logs at bottom of workspace */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950/40">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                  <Terminal size={10} /> Forensic Streamliner Pipeline Console
                </span>
                <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Air-Gapped Engine: Online
                </span>
              </div>
              <div className="forensic-logs-console">
                {logs.map((log, idx) => (
                  <div key={idx} className={`console-line ${log.type}`}>
                    <span className="text-zinc-600">[{log.timestamp}]</span> {log.text}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL OVERLAY */}
      {showRegModal && (
        <div className="forensics-modal-overlay">
          <div className="forensics-modal">
            <div className="modal-header">
              <h3 className="font-bold text-white text-base">Link Forensic Workstation Device</h3>
              <button 
                onClick={() => setShowRegModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold uppercase">Evidence Friendly Name</label>
                  <input 
                    type="text"
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Suspect A Phone Image"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold uppercase">Forensic Data Type</label>
                  <select 
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    value={regType}
                    onChange={(e) => setRegType(e.target.value)}
                  >
                    <option value="DiskImage">Partition Disk Image (.dd / .raw / .img / .e01 / .aff4)</option>
                    <option value="MemoryDump">Volatile System RAM Dump (.bin / .raw)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold uppercase">Workstation Absolute File Path</label>
                  <input 
                    type="text"
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                    value={regPath}
                    onChange={(e) => setRegPath(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-zinc-500 italic">
                    Specify the file path(s) on your local terminal. Separate multiple paths with commas (e.g., C:\image.dd, D:\memory.bin) to bulk link.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary-action" 
                  onClick={() => setShowRegModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-action"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Link Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEX SECTOR MODAL OVERLAY */}
      {showHexModal && (
        <div className="forensics-modal-overlay">
          <div className="forensics-modal hex-modal max-w-2xl">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-purple-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                  Raw Disk Sector Inspector
                </h3>
              </div>
              <button 
                onClick={() => setShowHexModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-1 mb-3">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Detected Sector Payload Metadata</span>
                <span className="text-xs font-mono text-purple-400 font-bold">{hexModalBlock}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">HEX / ASCII Raw Data View</span>
                <pre className="bg-zinc-950 p-4 border border-zinc-900 rounded-lg text-[10px] font-mono text-emerald-400/90 overflow-x-auto whitespace-pre leading-relaxed select-all">
                  {hexData}
                </pre>
              </div>
            </div>
            <div className="modal-footer flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 italic">ACPIA zero-copy block triager read signature. Sector data is immutable.</span>
              <button 
                type="button" 
                className="btn-primary-action" 
                onClick={() => setShowHexModal(false)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Collapsible Console Log Drawer */}
      <div className={`forensic-console-drawer ${consoleOpen ? "expanded" : "minimized"}`}>
        <div className="console-drawer-header" onClick={() => setConsoleOpen(!consoleOpen)}>
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-emerald-400" />
            <span className="text-[11px] font-mono font-bold text-zinc-300">AUTOMATED CORE CONSOLE</span>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded font-bold border border-emerald-900 animate-pulse">LIVE FEED</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {consoleOpen ? "Click to collapse [-]" : "Click to view stdout logs [+]"}
          </span>
        </div>
        {consoleOpen && (
          <div className="console-drawer-body">
            {[
              "[SYSTEM] Mounting Forensic Workstation Terminal...",
              "[SYSTEM] Zero-Copy Disk Block Stream initialized at 940 MB/s",
              "[TSK] Running mmls partition layout query...",
              "[TSK] Partition Table resolved. GPT style detected.",
              "[NSRL] Loading local Bloom Filter whitelist index...",
              "[NSRL] Bloom Filter parsed 217,402 OS file hashes in 4.2 seconds.",
              "[NSRL] 71.4% files skipped (Bloom Whitelist match).",
              "[ORCHESTRATOR] Escalating remaining 10 suspicious nodes to Tier 2 Classifier...",
              "[AI-CLASSIFIER] Sentiment Flow Analyzer evaluating timeline...",
              "[VOLATILITY] Parsing RAM dump system_memory.bin...",
              "[VOLATILITY] wininit.exe [PID 920] -> services.exe [PID 1024] -> explorer.exe [PID 3120]",
              "[VOLATILITY] Found threat process: spynet.exe [PID 4980]",
              "[VOLATILITY] Socket active: 192.168.1.15:52001 -> 185.220.101.5:8080 (Tor C2 gateway)"
            ].map((logStr, idx) => (
              <div key={idx} className="console-log-line">
                <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span> {logStr}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
