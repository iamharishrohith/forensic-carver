"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Clock, 
  MessageSquare, 
  MapPin, 
  Image as ImageIcon, 
  FileText, 
  Filter, 
  Calendar,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";
import "./timeline.css";

export default function Timeline() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [events, setEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTimeline(caseId)
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error loading timeline events:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === "All") return true;
    return ev.event_type === activeFilter;
  });

  const getEventIcon = (type) => {
    switch(type) {
      case "Chat":
        return (
          <div className="timeline-icon-bg chat">
            <MessageSquare style={{ height: "1rem", width: "1rem" }} />
          </div>
        );
      case "Location":
        return (
          <div className="timeline-icon-bg location">
            <MapPin style={{ height: "1rem", width: "1rem" }} />
          </div>
        );
      case "Media":
        return (
          <div className="timeline-icon-bg media">
            <ImageIcon style={{ height: "1rem", width: "1rem" }} />
          </div>
        );
      default:
        return (
          <div className="timeline-icon-bg system">
            <FileText style={{ height: "1rem", width: "1rem" }} />
          </div>
        );
    }
  };

  const getEventBadge = (type) => {
    switch(type) {
      case "Chat":
        return <span style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "10px", fontWeight: "600", border: "1px solid rgba(59,130,246,0.2)" }}>Chat</span>;
      case "Location":
        return <span style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "10px", fontWeight: "600", border: "1px solid rgba(16,185,129,0.2)" }}>Location</span>;
      case "Media":
        return <span style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "10px", fontWeight: "600", border: "1px solid rgba(139,92,246,0.2)" }}>Media</span>;
      default:
        return <span style={{ background: "#27272a", color: "var(--muted-light)", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "10px", fontWeight: "600", border: "1px solid var(--border)" }}>System</span>;
    }
  };

  return (
    <div className="timeline-container">
      {/* Header */}
      <div>
        <span className="sidebar-label">Chronological Sequence</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Investigation Timeline</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Trace communications, location uploads, and media captures in absolute timestamp sequence.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "var(--radius)" }}>
        <div className="filter-header">
          <Filter className="text-purple-400" style={{ height: "1rem", width: "1rem" }} />
          <span>Filter Sequence:</span>
        </div>
        <div className="filter-tabs-row">
          {["All", "Chat", "Media", "Location"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                fontSize: "0.75rem",
                padding: "0.375rem 0.875rem",
                borderRadius: "0.5rem",
                border: activeFilter === filter ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid var(--border)",
                background: activeFilter === filter ? "rgba(139, 92, 246, 0.15)" : "#09090b",
                color: activeFilter === filter ? "#a78bfa" : "var(--muted-light)",
                fontWeight: activeFilter === filter ? "600" : "500",
                transition: "all 0.2s ease"
              }}
            >
              {filter === "All" ? "All Events" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "6rem 0" }}>
          <div className="loader-content">
            <div className="loader-spinner"></div>
            <p className="loader-text">Synthesizing chronological events stream...</p>
          </div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="timeline-stream">
          {filteredEvents.map((ev) => {
            const eventDate = new Date(ev.timestamp);
            
            return (
              <div key={ev.id} style={{ position: "relative" }}>
                {/* Timeline connector circle */}
                <div className="timeline-connector">
                  {getEventIcon(ev.event_type)}
                </div>

                {/* Event Card */}
                <div className="glass-card event-card">
                  <div className="event-card-header">
                    <div className="event-meta-left">
                      {getEventBadge(ev.event_type)}
                      <span className="meta-separator">•</span>
                      <span className="event-time">
                        <Clock className="text-zinc-600" style={{ height: "0.875rem", width: "0.875rem" }} />
                        <span>{eventDate.toLocaleTimeString()}</span>
                      </span>
                    </div>

                    <div className="event-date-badge">
                      <Calendar className="text-purple-400" style={{ height: "0.75rem", width: "0.75rem" }} />
                      <span>{eventDate.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="event-description">
                    {ev.description}
                  </p>

                  <div className="event-card-footer">
                    <span className="event-source">
                      <Layers className="text-purple-400/60" style={{ height: "0.875rem", width: "0.875rem" }} />
                      <span>Source: {ev.source}</span>
                    </span>

                    {ev.location_gps && (
                      <span className="event-coords">
                        <MapPin style={{ height: "0.875rem", width: "0.875rem" }} />
                        <span>Coordinates: {ev.location_gps}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-timeline-placeholder">
          <Clock className="text-zinc-600 mb-3" style={{ height: "2.5rem", width: "2.5rem", margin: "0 auto 0.75rem auto" }} />
          <p className="loader-text">No sequence records match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
