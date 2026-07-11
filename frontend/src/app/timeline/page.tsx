"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Clock, 
  MessageSquare, 
  MapPin, 
  Image as ImageIcon, 
  FileText, 
  ShieldCheck, 
  Filter, 
  Calendar,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";

export default function Timeline() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [events, setEvents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch timeline events
    api.getTimeline(caseId)
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error loading timeline events:", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === "All") return true;
    return ev.event_type === activeFilter;
  });

  const getEventIcon = (type: string) => {
    switch(type) {
      case "Chat":
        return (
          <div className="bg-blue-600/20 border border-blue-500/30 p-2 rounded-full text-blue-400">
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      case "Location":
        return (
          <div className="bg-emerald-600/20 border border-emerald-500/30 p-2 rounded-full text-emerald-400">
            <MapPin className="h-4 w-4" />
          </div>
        );
      case "Media":
        return (
          <div className="bg-purple-600/20 border border-purple-500/30 p-2 rounded-full text-purple-400">
            <ImageIcon className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="bg-zinc-800 border border-zinc-700 p-2 rounded-full text-zinc-400">
            <FileText className="h-4 w-4" />
          </div>
        );
    }
  };

  const getEventBadge = (type: string) => {
    switch(type) {
      case "Chat":
        return <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-500/20">Chat</span>;
      case "Location":
        return <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/20">Location</span>;
      case "Media":
        return <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-purple-500/20">Media</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-zinc-700">System</span>;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Chronological Sequence</span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Investigation Timeline</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Trace communications, location uploads, and media captures in absolute timestamp sequence.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2 text-zinc-400 text-sm">
          <Filter className="h-4 w-4 text-purple-400" />
          <span className="font-medium">Filter Sequence:</span>
        </div>
        <div className="flex space-x-1.5">
          {["All", "Chat", "Media", "Location"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all ${
                activeFilter === filter
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/30 font-semibold"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
              }`}
            >
              {filter === "All" ? "All Events" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Synthesizing chronological events stream...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="relative border-l border-zinc-800 pl-8 ml-4 space-y-8 py-4">
          {filteredEvents.map((ev, index) => {
            const eventDate = new Date(ev.timestamp);
            
            return (
              <div key={ev.id} className="relative group">
                {/* Timeline connector circle */}
                <div className="absolute -left-[45px] top-1 z-10 transition-transform group-hover:scale-110">
                  {getEventIcon(ev.event_type)}
                </div>

                {/* Event Card */}
                <div className="glass-card p-5 rounded-xl space-y-3 transition-all hover:bg-zinc-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      {getEventBadge(ev.event_type)}
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-500 text-xs flex items-center space-x-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-zinc-600" />
                        <span>{eventDate.toLocaleTimeString()}</span>
                      </span>
                    </div>

                    <div className="text-zinc-500 text-xs flex items-center space-x-1 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                      <Calendar className="h-3 w-3 text-purple-400" />
                      <span>{eventDate.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-zinc-200 text-sm font-medium leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/40 text-xs text-zinc-500">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="h-3.5 w-3.5 text-purple-400/60" />
                      <span>Source: {ev.source}</span>
                    </span>

                    {ev.location_gps && (
                      <span className="flex items-center space-x-1 text-emerald-400 font-mono bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                        <MapPin className="h-3.5 w-3.5" />
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
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl">
          <Clock className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-500 text-sm">No sequence records match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
