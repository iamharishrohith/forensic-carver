"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Clock, 
  Network, 
  Map, 
  ShieldAlert, 
  Brain, 
  ClipboardList,
  AlertTriangle,
  Layers,
  ChevronDown,
  Globe,
  Plus
} from "lucide-react";
import { api } from "@/lib/api";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Evidence Explorer", href: "/evidence", icon: FolderOpen },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Knowledge Graph", href: "/graph", icon: Network },
  { name: "Map View", href: "/map", icon: Map },
  { name: "Risk Center", href: "/risk", icon: ShieldAlert },
  { name: "OSINT Expansion", href: "/osint", icon: Globe },
  { name: "AI Insights", href: "/insights", icon: Brain },
  { name: "Audit Logs", href: "/audit", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [cases, setCases] = useState<any[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<number>(1);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [username, setUsername] = useState("Investigator");

  useEffect(() => {
    const storedUser = localStorage.getItem("acpia_user");
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("acpia_token");
    localStorage.removeItem("acpia_user");
    window.location.href = "/login";
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;
    try {
      const data = await api.createCase(newCaseName, newCaseDesc);
      setCases(prev => [...prev, data]);
      setActiveCaseId(data.id);
      setShowCreateModal(false);
      setNewCaseName("");
      setNewCaseDesc("");
      const params = new URLSearchParams(searchParams.toString());
      params.set("case_id", String(data.id));
      router.push(`${pathname}?${params.toString()}`);
    } catch (err: any) {
      alert(`Failed to create case: ${err.message}`);
    }
  };

  useEffect(() => {
    // Load cases from API
    api.getCases()
      .then((data) => {
        setCases(data);
        // Check query param first
        const paramId = searchParams.get("case_id");
        if (paramId) {
          setActiveCaseId(Number(paramId));
        } else if (data.length > 0) {
          setActiveCaseId(data[0].id);
          // Set query param initially
          router.replace(`${pathname}?case_id=${data[0].id}`);
        }
      })
      .catch((err) => console.error("Error fetching cases:", err));
  }, []);

  // Update URL if case changes
  const handleCaseChange = (id: number) => {
    setActiveCaseId(id);
    setShowCaseDropdown(false);
    
    // Create new URLSearchParams to preserve other parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set("case_id", String(id));
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeCase = cases.find(c => c.id === activeCaseId) || { name: "Loading case..." };

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 text-zinc-100 z-30">
      {/* Platform Title */}
      <div className="p-6 border-b border-zinc-800 flex items-center space-x-3">
        <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
          <Brain className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="font-semibold text-lg tracking-wider text-purple-400">ACPIA</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Investigation Copilot</p>
        </div>
      </div>

      {/* Case Selector Dropdown */}
      <div className="px-4 py-4 border-b border-zinc-800 relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-semibold">Active Investigation</label>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-purple-400 hover:text-purple-300 p-0.5 rounded hover:bg-zinc-800 transition-colors"
            title="Create New Case"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button 
          onClick={() => setShowCaseDropdown(!showCaseDropdown)}
          className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-purple-500/30 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none"
        >
          <div className="flex items-center space-x-2 truncate">
            <Layers className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="truncate font-medium">{activeCase.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        </button>

        {showCaseDropdown && (
          <div className="absolute left-4 right-4 mt-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
            {cases.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCaseChange(c.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-600/10 hover:text-purple-300 transition-colors ${
                  activeCaseId === c.id ? "bg-purple-600/20 text-purple-300 font-semibold" : "text-zinc-400"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const currentCaseQuery = `?case_id=${activeCaseId}`;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={`${item.href}${currentCaseQuery}`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? "bg-purple-600/20 text-purple-300 border-l-4 border-purple-500" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : "text-zinc-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & Log Out */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/20 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-purple-600/30 flex items-center justify-center font-bold text-purple-300">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="text-zinc-300 font-medium truncate max-w-[120px]">{username}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-zinc-500 hover:text-red-400 font-semibold cursor-pointer transition-colors"
        >
          Log Out
        </button>
      </div>

      {/* Safety Notice footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/40">
        <div className="flex items-start space-x-2 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-normal">
            Authorized Personnel Only. Actions logged for audit trail.
          </p>
        </div>
      </div>
      {/* Create Case Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-base">New Investigation Case</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-semibold focus:outline-none"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleCreateCase} className="space-y-4 text-sm">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Case Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Operation Safe Haven Phase 2"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Description</label>
                <textarea 
                  placeholder="Summarize target intelligence objectives..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition-colors focus:outline-none"
              >
                Create Investigation Case
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
