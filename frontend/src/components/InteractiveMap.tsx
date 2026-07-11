"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  id: number;
  timestamp: string;
  description: string;
  location_gps: string;
  source: string;
  event_type: string;
}

interface InteractiveMapProps {
  locations: Location[];
  selectedLoc: Location | null;
  onSelectLoc: (loc: Location) => void;
}

export default function InteractiveMap({ locations, selectedLoc, onSelectLoc }: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<{ [key: number]: L.CircleMarker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const boundsRectRef = useRef<L.Rectangle | null>(null);

  // Convert coordinate string "lat,lon" to floats
  const parseCoords = (coordStr: string) => {
    if (!coordStr) return { lat: 13.0827, lon: 80.2707 }; // Default Chennai coordinates
    const parts = coordStr.split(",");
    return {
      lat: parseFloat(parts[0]),
      lon: parseFloat(parts[1])
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Map if not created
    if (!mapRef.current) {
      // Default to Chennai zoom
      mapRef.current = L.map(containerRef.current, {
        center: [13.0827, 80.2707],
        zoom: 12,
        zoomControl: true,
      });

      // Dark Mode Map Tiles (CartoDB Dark Matter fits the ACPIA cyber-grid aesthetic!)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // 2. Clear existing layers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (boundsRectRef.current) {
      boundsRectRef.current.remove();
      boundsRectRef.current = null;
    }

    if (locations.length === 0) return;

    // 3. Map Coordinates and Draw markers
    const latLons: L.LatLngExpression[] = [];
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

    locations.forEach((loc) => {
      const coords = parseCoords(loc.location_gps);
      const isSelected = selectedLoc?.id === loc.id;
      latLons.push([coords.lat, coords.lon]);

      // Calculate bounding box limits
      minLat = Math.min(minLat, coords.lat);
      maxLat = Math.max(maxLat, coords.lat);
      minLon = Math.min(minLon, coords.lon);
      maxLon = Math.max(maxLon, coords.lon);

      // Create Tactical Circle Marker
      const marker = L.circleMarker([coords.lat, coords.lon], {
        radius: isSelected ? 12 : 7,
        fillColor: isSelected ? "#a78bfa" : "#10b981", // purple selection, emerald normal
        color: isSelected ? "#ffffff" : "#047857",
        weight: isSelected ? 3 : 1.5,
        opacity: 0.9,
        fillOpacity: 0.8
      }).addTo(map);

      // Popup
      marker.bindPopup(`
        <div style="font-family: monospace; color: #18181b; font-size: 11px;">
          <b style="color: #8b5cf6;">GPS Pin [${loc.id}]</b><br/>
          <b>Source:</b> ${loc.source}<br/>
          <b>Desc:</b> ${loc.description}<br/>
          <b>Time:</b> ${new Date(loc.timestamp).toLocaleTimeString()}<br/>
          <b>Coords:</b> ${loc.location_gps}
        </div>
      `);

      marker.on("click", () => {
        onSelectLoc(loc);
      });

      markersRef.current[loc.id] = marker;
    });

    // 4. Draw Suspect Tracking Polyline Path
    if (latLons.length > 1) {
      polylineRef.current = L.polyline(latLons, {
        color: "#a78bfa", // Glowing purple track line
        weight: 2,
        opacity: 0.5,
        dashArray: "6, 6"
      }).addTo(map);
    }

    // 5. Draw Custom Bounding Box (Geographical Search Boundary)
    if (locations.length > 1) {
      // Add a slight margin/padding around bounding box
      const latMargin = (maxLat - minLat) * 0.1 || 0.005;
      const lonMargin = (maxLon - minLon) * 0.1 || 0.005;
      const bounds = L.latLngBounds(
        [minLat - latMargin, minLon - lonMargin],
        [maxLat + latMargin, maxLon + lonMargin]
      );

      boundsRectRef.current = L.rectangle(bounds, {
        color: "#ef4444", // red alert boundary
        weight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: 0.03,
        dashArray: "4, 8"
      }).addTo(map);
      
      // Label Bounding Box
      boundsRectRef.current.bindTooltip("INVESTIGATION TACTICAL BOUNDARY (Chennai clusters)", {
        permanent: false,
        direction: "top",
        className: "bg-red-950 border border-red-500/30 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded"
      });

      // Fit map bounds
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (locations.length === 1) {
      // Pan to single location
      const singleCoords = parseCoords(locations[0].location_gps);
      map.setView([singleCoords.lat, singleCoords.lon], 14);
    }

  }, [locations, onSelectLoc]);

  // Handle selectedLoc updates
  useEffect(() => {
    if (!mapRef.current || !selectedLoc) return;
    const coords = parseCoords(selectedLoc.location_gps);
    
    // Pan to selection
    mapRef.current.setView([coords.lat, coords.lon], mapRef.current.getZoom());

    // Highlight marker specifically
    const marker = markersRef.current[selectedLoc.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLoc]);

  return (
    <div className="relative w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-0 bg-zinc-950"></div>
    </div>
  );
}
