"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function InteractiveMap({ locations, selectedLoc, onSelectLoc }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const boundsRectRef = useRef(null);

  const parseCoords = (coordStr) => {
    if (!coordStr) return { lat: 13.0827, lon: 80.2707 };
    const parts = coordStr.split(",");
    return {
      lat: parseFloat(parts[0]),
      lon: parseFloat(parts[1])
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [13.0827, 80.2707],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

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

    const latLons = [];
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

    locations.forEach((loc) => {
      const coords = parseCoords(loc.location_gps);
      const isSelected = selectedLoc?.id === loc.id;
      latLons.push([coords.lat, coords.lon]);

      minLat = Math.min(minLat, coords.lat);
      maxLat = Math.max(maxLat, coords.lat);
      minLon = Math.min(minLon, coords.lon);
      maxLon = Math.max(maxLon, coords.lon);

      const marker = L.circleMarker([coords.lat, coords.lon], {
        radius: isSelected ? 12 : 7,
        fillColor: isSelected ? "#a78bfa" : "#10b981",
        color: isSelected ? "#ffffff" : "#047857",
        weight: isSelected ? 3 : 1.5,
        opacity: 0.9,
        fillOpacity: 0.8
      }).addTo(map);

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

    if (latLons.length > 1) {
      polylineRef.current = L.polyline(latLons, {
        color: "#a78bfa",
        weight: 2,
        opacity: 0.5,
        dashArray: "6, 6"
      }).addTo(map);
    }

    if (locations.length > 1) {
      const latMargin = (maxLat - minLat) * 0.1 || 0.005;
      const lonMargin = (maxLon - minLon) * 0.1 || 0.005;
      const bounds = L.latLngBounds(
        [minLat - latMargin, minLon - lonMargin],
        [maxLat + latMargin, maxLon + lonMargin]
      );

      boundsRectRef.current = L.rectangle(bounds, {
        color: "#ef4444",
        weight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: 0.03,
        dashArray: "4, 8"
      }).addTo(map);
      
      boundsRectRef.current.bindTooltip("INVESTIGATION TACTICAL BOUNDARY (Chennai clusters)", {
        permanent: false,
        direction: "top",
        className: "bg-red-950 border border-red-500/30 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded"
      });

      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (locations.length === 1) {
      const singleCoords = parseCoords(locations[0].location_gps);
      map.setView([singleCoords.lat, singleCoords.lon], 14);
    }

  }, [locations, onSelectLoc]);

  useEffect(() => {
    if (!mapRef.current || !selectedLoc) return;
    const coords = parseCoords(selectedLoc.location_gps);
    
    mapRef.current.setView([coords.lat, coords.lon], mapRef.current.getZoom());

    const marker = markersRef.current[selectedLoc.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLoc]);

  return (
    <div className="w-full h-full overflow-hidden" style={{ minHeight: "450px", borderRadius: "var(--radius)", border: "1px solid var(--border)", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 0, backgroundColor: "#09090b" }}></div>
    </div>
  );
}
