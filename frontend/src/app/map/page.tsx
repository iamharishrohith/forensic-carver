"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  MapPin, 
  Clock, 
  FolderOpen, 
  Navigation,
  Globe,
  Compass,
  AlertTriangle,
  Layers,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";

// Dynamically load Leaflet Map to bypass Next.js SSR windows checking
const InteractiveMap = dynamic(
  () => import("@/components/InteractiveMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950/60 border border-zinc-800 rounded-xl min-h-[450px]">
        <Globe className="h-10 w-10 text-purple-500 animate-spin mb-4" />
        <span className="text-sm text-zinc-400 font-mono">Initializing GPS Tactical Overlays...</span>
      </div>
    )
  }
);

export default function MapView() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTimeline(caseId, "Location")
      .then((data) => {
        setLocations(data);
        if (data.length > 0) {
          setSelectedLoc(data[0]);
        }
      })
      .catch((err) => console.error("Error loading locations:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  // Convert coordinate string "lat,lon" to floats
  const parseCoords = (coordStr: string) => {
    if (!coordStr) return { lat: 13.0827, lon: 80.2707 };
    const parts = coordStr.split(",");
    return {
      lat: parseFloat(parts[0]),
      lon: parseFloat(parts[1])
    };
  };

  // Calculate bounding box bounds if multiple locations exist
  const getBoundingBox = () => {
    if (locations.length <= 1) return null;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    locations.forEach(loc => {
      const coords = parseCoords(loc.location_gps);
      minLat = Math.min(minLat, coords.lat);
      maxLat = Math.max(maxLat, coords.lat);
      minLon = Math.min(minLon, coords.lon);
      maxLon = Math.max(maxLon, coords.lon);
    });
    return {
      ne: `${maxLat.toFixed(4)}, ${maxLon.toFixed(4)}`,
      sw: `${minLat.toFixed(4)}, ${minLon.toFixed(4)}`,
      center: `${((maxLat + minLat)/2).toFixed(4)}, ${((maxLon + minLon)/2).toFixed(4)}`
    };
  };
  const bbox = getBoundingBox();

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Spatial Intelligence</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Geographical Map View</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Map device activity logs, coordinate signatures, and cellular ping clusters geographically.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
        {/* Left column: Location List & Metrics */}
        <div className="space-y-6 flex flex-col">
          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2">
              <Compass className="h-4 w-4 text-purple-400" />
              <span>Extracted GPS Coordinates ({locations.length})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[380px]">
            {loading ? (
              <div className="py-12 text-center text-zinc-500">
                <div className="h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span>Mapping coordinates...</span>
              </div>
            ) : locations.length > 0 ? (
              locations.map((loc) => {
                const isActive = selectedLoc?.id === loc.id;
                
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLoc(loc)}
                    className={`glass-card p-4 rounded-xl cursor-pointer transition-all ${
                      isActive 
                        ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2.5 rounded-lg border ${
                        isActive 
                          ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-500"
                      }`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block font-mono uppercase">
                          Time: {new Date(loc.timestamp).toLocaleString()}
                        </span>
                        <p className="text-zinc-200 text-xs font-semibold mt-1 truncate">
                          {loc.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[10px] font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400">
                            {loc.location_gps}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-zinc-500 glass-card rounded-xl">
                <AlertTriangle className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs">No active geotags detected in files.</p>
              </div>
            )}
          </div>

          {/* Tactical Bounding Box Info Card */}
          {bbox && (
            <div className="glass-card p-4 rounded-xl space-y-3 border-red-500/20 bg-red-950/5">
              <div className="flex items-center space-x-2 text-red-400 font-semibold text-xs font-mono">
                <Layers className="h-4 w-4" />
                <span>TACTICAL CLUSTER LIMITS</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-zinc-400 pt-1">
                <div>
                  <span className="text-zinc-500 block">NORTH-EAST</span>
                  <span className="text-zinc-200 font-medium">{bbox.ne}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">SOUTH-WEST</span>
                  <span className="text-zinc-200 font-medium">{bbox.sw}</span>
                </div>
                <div className="col-span-2 border-t border-zinc-900 pt-2">
                  <span className="text-zinc-500 block">CENTER OF OPERATIONS</span>
                  <span className="text-emerald-400 font-medium">{bbox.center}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Interactive Leaflet Map & Selected Detail Footer */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="flex-1 glass-card p-2 rounded-xl bg-zinc-950 border border-zinc-800 min-h-[450px] flex flex-col">
            <div className="flex-1 rounded-lg overflow-hidden relative">
              {locations.length > 0 ? (
                <InteractiveMap 
                  locations={locations}
                  selectedLoc={selectedLoc}
                  onSelectLoc={(loc) => setSelectedLoc(loc)}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs py-24">
                  <Globe className="h-10 w-10 text-zinc-700 mb-2 animate-pulse" />
                  <span>Waiting for spatial coordinates match...</span>
                </div>
              )}
            </div>

            {/* Selection Detail Overlay Footer */}
            {selectedLoc && (
              <div className="bg-zinc-900/80 border border-zinc-850 p-4 rounded-xl flex items-center justify-between text-xs backdrop-blur mt-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Linked Source Payload</span>
                  <span className="text-zinc-200 font-medium flex items-center space-x-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
                    <span>{selectedLoc.source}</span>
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Geotag Registered</span>
                  <span className="text-zinc-300 flex items-center justify-end space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{new Date(selectedLoc.timestamp).toLocaleString()}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
