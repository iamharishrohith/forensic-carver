"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Globe, 
  Search, 
  UserPlus, 
  Compass, 
  ExternalLink,
  MapPin,
  CheckCircle
} from "lucide-react";
import { api } from "@/lib/api";
import "./osint.css";

export default function OSINTHub() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [importedUrls, setImportedUrls] = useState({});

  const handleScan = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setScanning(true);
    setResults([]);
    setStatusMessage(null);
    
    setTimeout(async () => {
      try {
        const data = await api.scanOSINT(query);
        setResults(data.results);
        if (data.results.length === 0) {
          setStatusMessage("No matching public indices isolated for this keyword query.");
        }
      } catch (err) {
        console.error("OSINT Scan error:", err);
        setStatusMessage("OSINT indexing connection failed.");
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  const handleImportProfile = async (profile) => {
    try {
      await api.importOSINT(
        caseId,
        profile.platform,
        profile.username,
        profile.details,
        profile.linked_locations,
        query
      );
      
      setImportedUrls(prev => ({
        ...prev,
        [`${profile.platform}-${profile.username}`]: true
      }));
      
      setStatusMessage(`Successfully imported @${profile.username} (${profile.platform}) node into Case Knowledge Graph.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="osint-container">
      {/* Title */}
      <div>
        <span className="sidebar-label">Public Intel Harvester</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">OSINT & Social Media Expansion</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Launch public index scans across Instagram, Twitter/X, Telegram, Truecaller, and WHOIS registries to gather external cybercrime footprint coordinates.
        </p>
      </div>

      {/* Search Header Form */}
      <div className="glass-card p-6" style={{ borderRadius: "var(--radius)" }}>
        <form onSubmit={handleScan} style={{ display: "flex", gap: "1rem" }}>
          <div className="search-input-wrapper">
            <Search className="search-input-icon" style={{ top: "0.875rem" }} />
            <input 
              type="text" 
              required
              placeholder="Enter suspect alias, phone (+91...), or email address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "2.5rem", width: "100%" }}
            />
          </div>
          <button
            type="submit"
            disabled={scanning}
            className="btn-primary"
            style={{ padding: "0.75rem 1.5rem" }}
          >
            {scanning ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div className="animate-spin" style={{ height: "1rem", width: "1rem", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }}></div>
                <span>Scanning Online Space...</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Globe style={{ height: "1rem", width: "1rem" }} />
                <span>Launch OSINT Scan</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="alert-banner success">
          <CheckCircle style={{ height: "1.125rem", width: "1.125rem" }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Radar scanning indicator visual */}
      {scanning && (
        <div className="glass-card osint-radar-box">
          <div className="radar-animation-wrapper animate-pulse">
            <Globe className="text-purple-400 animate-spin" style={{ height: "2.5rem", width: "2.5rem", animationDuration: "3s" }} />
          </div>
          <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h4 className="font-semibold text-zinc-200 text-sm">Harvesting cyber footprints...</h4>
            <p className="text-xs text-zinc-500">Querying platform registries, parsing handle tags, and matching contact signatures.</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!scanning && results.length > 0 && (
        <div className="inspector-section">
          <h4 className="section-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Compass style={{ height: "1.125rem", width: "1.125rem", color: "var(--primary)" }} />
            <span>Scan Results ({results.length} Footprints Mapped)</span>
          </h4>

          <div className="osint-results-grid">
            {results.map((profile, i) => {
              const importedKey = `${profile.platform}-${profile.username}`;
              const isImported = importedUrls[importedKey] === true;
              
              return (
                <div key={i} className="glass-card osint-card">
                  <div className="inspector-section" style={{ gap: "0.75rem" }}>
                    {/* Card Header */}
                    <div className="pipeline-header">
                      <span style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", padding: "0.25rem 0.6rem", borderRadius: "0.5rem", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" }}>
                        {profile.platform}
                      </span>
                      {profile.profile_url !== "#" && (
                        <a 
                          href={profile.profile_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="panel-link"
                        >
                          <span>Visit Profile</span>
                          <ExternalLink className="panel-link-icon" />
                        </a>
                      )}
                    </div>

                    {/* Profile Handle */}
                    <div>
                      <h4 className="font-bold text-white text-base">@{profile.username}</h4>
                      <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-medium">
                        {profile.details}
                      </p>
                    </div>

                    {/* Geotags */}
                    {profile.linked_locations && (
                      <div className="integrity-verification-tag" style={{ color: "#34d399", marginTop: 0 }}>
                        <MapPin style={{ height: "0.875rem", width: "0.875rem" }} />
                        <span>Tagged locations: {profile.linked_locations}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="verdict-item-header" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                    {isImported ? (
                      <span className="status-badge status-analyzed" style={{ padding: "0.5rem 0.75rem" }}>
                        <CheckCircle style={{ height: "1rem", width: "1rem" }} />
                        <span>Imported to Graph</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportProfile(profile)}
                        className="btn-secondary"
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        <UserPlus className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
                        <span>Import Entity to Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
