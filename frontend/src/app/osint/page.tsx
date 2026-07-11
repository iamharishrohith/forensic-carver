"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Globe, 
  Search, 
  UserPlus, 
  Compass, 
  ArrowRight,
  ExternalLink,
  MapPin,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";

export default function OSINTHub() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importedUrls, setImportedUrls] = useState<Record<string, boolean>>({});

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setScanning(true);
    setResults([]);
    setStatusMessage(null);
    
    // Simulate active scan progress delay for high-fidelity radar visual
    setTimeout(async () => {
      try {
        const data = await api.scanOSINT(query);
        setResults(data.results);
        if (data.results.length === 0) {
          setStatusMessage("No matching public indices isolated for this keyword query.");
        }
      } catch (err: any) {
        console.error("OSINT Scan error:", err);
        setStatusMessage("OSINT indexing connection failed.");
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  const handleImportProfile = async (profile: any) => {
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
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Public Intel Harvester</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">OSINT & Social Media Expansion</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Launch public index scans across Instagram, Twitter/X, Telegram, Truecaller, and WHOIS registries to gather external cybercrime profile footprints.
        </p>
      </div>

      {/* Search Header Form */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
            <input 
              type="text" 
              required
              placeholder="Enter suspect alias, phone (+91...), or email address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={scanning}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-md focus:outline-none"
          >
            {scanning ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning Online Space...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span>Launch OSINT Scan</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl flex items-center space-x-3 text-emerald-400 text-xs font-semibold">
          <CheckCircle className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Radar scanning indicator visual */}
      {scanning && (
        <div className="glass-card p-12 rounded-2xl flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <div className="relative h-24 w-24 border border-purple-500/20 rounded-full flex items-center justify-center animate-pulse">
            <div className="absolute inset-0 border border-purple-500/30 rounded-full animate-ping duration-1000"></div>
            <Globe className="h-10 w-10 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-semibold text-zinc-200 text-sm">Harvesting cyber footprints...</h4>
            <p className="text-xs text-zinc-500">Querying platform registries, parsing handle tags, and matching contact signatures.</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {!scanning && results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center space-x-2">
            <Compass className="h-4.5 w-4.5 text-purple-400" />
            <span>Scan Results ({results.length} Footprints Mapped)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((profile, i) => {
              const importedKey = `${profile.platform}-${profile.username}`;
              const isImported = importedUrls[importedKey] === true;
              
              return (
                <div key={i} className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 border border-zinc-800 hover:border-purple-500/20 transition-all">
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <span className="bg-purple-600/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                        {profile.platform}
                      </span>
                      {profile.profile_url !== "#" && (
                        <a 
                          href={profile.profile_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center space-x-1"
                        >
                          <span>Visit Profile</span>
                          <ExternalLink className="h-3 w-3" />
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
                      <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Tagged locations: {profile.linked_locations}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-zinc-800/40 pt-4 flex items-center justify-end text-xs">
                    {isImported ? (
                      <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle className="h-4 w-4" />
                        <span>Imported to Graph</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportProfile(profile)}
                        className="bg-zinc-950 border border-zinc-800 hover:border-purple-500/30 text-zinc-300 px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-all focus:outline-none"
                      >
                        <UserPlus className="h-4 w-4 text-purple-400" />
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
