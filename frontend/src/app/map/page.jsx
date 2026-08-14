"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  MapPin, 
  Clock, 
  FolderOpen, 
  Globe, 
  Compass, 
  AlertTriangle,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";
import "./map.css";

const InteractiveMap = dynamic(
  () => import("@/components/InteractiveMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="empty-timeline-placeholder" style={{ minHeight: "450px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Globe className="text-purple-500 animate-spin mb-4" style={{ height: "2.5rem", width: "2.5rem" }} />
        <span className="loader-text font-mono">Initializing GPS Tactical Overlays...</span>
      </div>
    )
  }
);

export default function MapView() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [locations, setLocations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState(null);
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

  const parseCoords = (coordStr) => {
    if (!coordStr) return { lat: 13.0827, lon: 80.2707 };
    const parts = coordStr.split(",");
    return {
      lat: parseFloat(parts[0]),
      lon: parseFloat(parts[1])
    };
  };

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
    <div className="map-container">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span className="sidebar-label">Spatial Intelligence</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Geographical Map View</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Map device activity logs, coordinate signatures, and cellular ping clusters geographically.
          </p>
        </div>
      </div>

      <div className="map-layout-grid" style={{ minHeight: "500px" }}>
        {/* Left column: Location List & Metrics */}
        <div className="inspector-section" style={{ gap: "1.5rem" }}>
          <div className="glass-card p-4" style={{ borderRadius: "var(--radius)" }}>
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Compass className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
              <span>Extracted GPS Coordinates ({locations.length})</span>
            </h3>
          </div>

          <div className="verdict-list" style={{ flexGrow: 1, maxHeight: "380px" }}>
            {loading ? (
              <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "3rem 0" }}>
                <div className="loader-content">
                  <div className="loader-spinner" style={{ height: "1.5rem", width: "1.5rem" }}></div>
                  <p className="loader-text">Mapping coordinates...</p>
                </div>
              </div>
            ) : locations.length > 0 ? (
              locations.map((loc) => {
                const isActive = selectedLoc?.id === loc.id;
                
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLoc(loc)}
                    className="glass-card p-4"
                    style={{
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border)",
                      background: isActive ? "rgba(16, 185, 129, 0.03)" : "var(--card)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <div style={{
                        padding: "0.6rem",
                        borderRadius: "0.5rem",
                        border: isActive ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border)",
                        background: isActive ? "rgba(16, 185, 129, 0.1)" : "#09090b",
                        color: isActive ? "#34d399" : "var(--muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <MapPin style={{ height: "1rem", width: "1rem" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="sidebar-label" style={{ fontFamily: "monospace" }}>
                          Time: {new Date(loc.timestamp).toLocaleString()}
                        </span>
                        <p className="text-zinc-200 text-xs font-semibold mt-1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {loc.description}
                        </p>
                        <div style={{ marginTop: "0.5rem" }}>
                          <span className="mono-text" style={{ fontSize: "10px", background: "#09090b", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", border: "1px solid var(--border)", color: "#a1a1aa" }}>
                            {loc.location_gps}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-timeline-placeholder">
                <AlertTriangle className="text-zinc-600 mb-2" style={{ height: "2rem", width: "2rem", margin: "0 auto" }} />
                <p className="loader-text">No active geotags detected in files.</p>
              </div>
            )}
          </div>

          {/* Tactical Bounding Box Info Card */}
          {bbox && (
            <div className="glass-card p-4 space-y-3" style={{ borderRadius: "var(--radius)", borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.03)" }}>
              <div className="integrity-verification-tag" style={{ color: "#f87171", marginTop: 0, fontFamily: "monospace" }}>
                <Layers style={{ height: "1rem", width: "1rem" }} />
                <span>TACTICAL CLUSTER LIMITS</span>
              </div>
              <div className="forensic-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", background: "none", border: "none", padding: 0 }}>
                <div>
                  <span className="grid-label">NORTH-EAST</span>
                  <span className="grid-value" style={{ color: "#e4e4e7" }}>{bbox.ne}</span>
                </div>
                <div>
                  <span className="grid-label">SOUTH-WEST</span>
                  <span className="grid-value" style={{ color: "#e4e4e7" }}>{bbox.sw}</span>
                </div>
                <div style={{ gridColumn: "span 2 / span 2", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                  <span className="grid-label">CENTER OF OPERATIONS</span>
                  <span className="grid-value" style={{ color: "#34d399" }}>{bbox.center}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Interactive Leaflet Map & Selected Detail Footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card p-2 flex flex-col" style={{ flexGrow: 1, borderRadius: "var(--radius)", backgroundColor: "#09090b", border: "1px solid var(--border)", minHeight: "450px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ flexGrow: 1, borderRadius: "0.5rem", overflow: "hidden", position: "relative" }}>
              {locations.length > 0 ? (
                <InteractiveMap 
                  locations={locations}
                  selectedLoc={selectedLoc}
                  onSelectLoc={(loc) => setSelectedLoc(loc)}
                />
              ) : (
                <div className="empty-timeline-placeholder" style={{ border: "none" }}>
                  <Globe className="text-zinc-700 mb-2 animate-pulse" style={{ height: "2rem", width: "2rem", margin: "0 auto" }} />
                  <p className="loader-text">Waiting for spatial coordinates match...</p>
                </div>
              )}
            </div>

            {/* Selection Detail Overlay Footer */}
            {selectedLoc && (
              <div className="bg-zinc-900/80 p-4 rounded-xl flex items-center justify-between text-xs" style={{ border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="sidebar-label">Linked Source Payload</span>
                  <span className="event-source" style={{ color: "#ffffff", marginTop: "0.25rem" }}>
                    <FolderOpen className="text-purple-400" style={{ height: "0.875rem", width: "0.875rem" }} />
                    <span>{selectedLoc.source}</span>
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="sidebar-label">Geotag Registered</span>
                  <span className="event-source" style={{ color: "var(--muted-light)", marginTop: "0.25rem", justifyContent: "flex-end" }}>
                    <Clock style={{ height: "0.875rem", width: "0.875rem", color: "var(--muted)" }} />
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
