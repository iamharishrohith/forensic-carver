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

export default function EvidenceExplorer() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEvidence = () => {
    api.getEvidence(caseId)
      .then((data) => {
        setEvidenceList(data);
        if (data.length > 0 && !selectedEvidence) {
          // Select first by default
          handleSelectEvidence(data[0]);
        }
      })
      .catch((err) => console.error("Error loading evidence:", err));
  };

  useEffect(() => {
    fetchEvidence();
  }, [caseId]);

  const handleSelectEvidence = (ev: any) => {
    setSelectedEvidence(ev);
    // Fetch AI decisions for this evidence
    api.getDecisions(ev.id)
      .then((data) => setDecisions(data))
      .catch((err) => console.error("Error loading decisions:", err));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    let uploadedCount = 0;
    let errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await api.uploadEvidence(caseId, file);
        uploadedCount++;
        if (i === files.length - 1) {
          handleSelectEvidence(uploaded);
        }
      } catch (err: any) {
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

  // Filters
  const filteredEvidence = evidenceList.filter((ev) => {
    const matchesSearch = ev.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ev.sha256.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || ev.file_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch(type) {
      case "Image": return <ImageIcon className="h-6 w-6 text-purple-400" />;
      case "Video": return <VideoIcon className="h-6 w-6 text-pink-400" />;
      case "Conversation": return <FileText className="h-6 w-6 text-blue-400" />;
      case "Document": return <FileText className="h-6 w-6 text-yellow-400" />;
      case "Audio": return <FileAudio className="h-6 w-6 text-emerald-400" />;
      default: return <File className="h-6 w-6 text-zinc-400" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const parsedMeta = selectedEvidence ? JSON.parse(selectedEvidence.metadata_json || "{}") : {};

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Evidence Registry</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Evidence Explorer</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Securely upload, hash verify, and inspect digital forensics payload parameters.
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <input 
            type="file" 
            multiple
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={triggerFileInput}
            disabled={uploading}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-all shadow-md focus:outline-none"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading Batch...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Evidence Files</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Messages */}
      {uploadError && (
        <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-lg flex items-center space-x-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-lg flex items-center space-x-3 text-emerald-400 text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Workspace Area: Left List, Right Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
        {/* Left Side: Filter and List */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {/* Filters Panel */}
          <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search by filename or SHA-256 hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            {/* Category Filter */}
            <div className="flex space-x-1.5 overflow-x-auto">
              {["All", "Image", "Video", "Conversation", "Document", "Audio"].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    selectedType === type
                      ? "bg-purple-600/20 text-purple-300 border-purple-500/30 font-semibold"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto max-h-[600px] space-y-3 pr-2">
            {filteredEvidence.length > 0 ? (
              filteredEvidence.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvidence(ev)}
                  className={`glass-card p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedEvidence?.id === ev.id 
                      ? "border-purple-500/40 bg-purple-600/5" 
                      : "hover:bg-zinc-800/30"
                  }`}
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      {getFileIcon(ev.file_type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-zinc-200 text-sm truncate">{ev.filename}</h4>
                      <p className="text-zinc-500 text-xs mt-0.5 flex items-center space-x-2">
                        <span>{ev.file_type}</span>
                        <span>•</span>
                        <span>{formatBytes(ev.size_bytes)}</span>
                        <span>•</span>
                        <span className="font-mono">{ev.sha256.substring(0, 10)}...</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 flex-shrink-0">
                    {ev.status === "processed" ? (
                      <span className="flex items-center space-x-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" />
                        <span>Analyzed</span>
                      </span>
                    ) : ev.status === "processing" ? (
                      <span className="flex items-center space-x-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>Analyzing</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-zinc-500 text-xs bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        <span>Pending</span>
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-zinc-500 glass-card rounded-xl">
                <File className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                <p className="text-sm">No evidence matching filters has been cataloged.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Metadata Inspector */}
        <div className="glass-card rounded-xl p-6 flex flex-col space-y-6 overflow-y-auto max-h-[700px]">
          {selectedEvidence ? (
            <>
              {/* Top Summary */}
              <div className="border-b border-zinc-800 pb-4">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Evidence Profile</span>
                <h3 className="text-lg font-bold text-white mt-1 break-words">{selectedEvidence.filename}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold">Integrity Verified (SHA-256)</span>
                </div>
              </div>

              {/* General details */}
              <div className="space-y-4">
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Forensic Metrics</h4>
                <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">File Format</span>
                    <span className="text-xs text-zinc-300 font-semibold">{parsedMeta.extension || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Payload Size</span>
                    <span className="text-xs text-zinc-300 font-semibold">{formatBytes(selectedEvidence.size_bytes)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-zinc-500 block">SHA-256 Checksum</span>
                    <span className="text-xs text-zinc-300 font-mono break-all">{selectedEvidence.sha256}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-zinc-500 block">Storage Path</span>
                    <span className="text-xs text-zinc-400 font-mono break-all text-[11px]">{selectedEvidence.filepath}</span>
                  </div>
                </div>
              </div>

              {/* EXIF Metadata (if Image) */}
              {selectedEvidence.file_type === "Image" && parsedMeta.exif && (
                <div className="space-y-4">
                  <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">EXIF Parameters</h4>
                  <div className="space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Camera Make:</span>
                      <span className="text-zinc-300">{parsedMeta.camera_make || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Camera Model:</span>
                      <span className="text-zinc-300">{parsedMeta.camera_model || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Date Taken:</span>
                      <span className="text-zinc-300">{parsedMeta.capture_date || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Resolution:</span>
                      <span className="text-zinc-300">{parsedMeta.width} x {parsedMeta.height}</span>
                    </div>
                    {parsedMeta.gps_coordinates && (
                      <div className="flex justify-between border-t border-zinc-800/60 pt-2 mt-2">
                        <span className="text-zinc-400 font-semibold">GPS Coordinates:</span>
                        <span className="text-purple-400 font-mono">{parsedMeta.gps_coordinates}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Preview (if Text Document/Conversation) */}
              {parsedMeta.text_preview && (
                <div className="space-y-4">
                  <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">OCR / File Raw Preview</h4>
                  <div className="bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-900 text-xs font-mono max-h-[220px] overflow-y-auto text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {parsedMeta.text_preview}
                  </div>
                </div>
              )}

              {/* AI Agent Decisions summary */}
              <div className="space-y-4 border-t border-zinc-800 pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span>Agent Verdicts ({decisions.length})</span>
                  </h4>
                  <Link href={`/insights?case_id=${caseId}`} className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1">
                    <span>AI Insights</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {decisions.map((dec) => (
                    <div key={dec.id} className="text-xs bg-zinc-950/60 p-3 rounded-lg border border-zinc-900/60 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-zinc-300">{dec.agent_name.replace("Agent ", "A")}</span>
                        <span className="text-[10px] bg-purple-950/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/30 font-medium">
                          {(dec.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                      <p className="text-zinc-400 font-medium">{dec.decision}</p>
                      <p className="text-zinc-500 text-[11px] italic leading-normal border-t border-zinc-800/40 pt-1 mt-1">
                        Reasoning: {dec.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center py-20">
              <div>
                <File className="h-8 w-8 mx-auto text-zinc-700 mb-2 animate-bounce" />
                <p>Select an evidence file to inspect forensic parameters.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
