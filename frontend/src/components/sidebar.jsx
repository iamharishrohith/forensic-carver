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
  Plus,
  HardDrive
} from "lucide-react";
import { api } from "@/lib/api";
import "./sidebar.css";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Evidence Explorer", href: "/evidence", icon: FolderOpen },
  { name: "Forensics Explorer", href: "/forensics", icon: HardDrive },
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
  
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(1);
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

  const handleCreateCase = async (e) => {
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
    } catch (err) {
      alert(`Failed to create case: ${err.message}`);
    }
  };

  useEffect(() => {
    api.getCases()
      .then((data) => {
        setCases(data);
        const paramId = searchParams.get("case_id");
        if (paramId) {
          setActiveCaseId(Number(paramId));
        } else if (data.length > 0) {
          setActiveCaseId(data[0].id);
          router.replace(`${pathname}?case_id=${data[0].id}`);
        }
      })
      .catch((err) => console.error("Error fetching cases:", err));
  }, []);

  const handleCaseChange = (id) => {
    setActiveCaseId(id);
    setShowCaseDropdown(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("case_id", String(id));
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeCase = cases.find(c => c.id === activeCaseId) || { name: "Loading case..." };

  return (
    <aside className="sidebar">
      {/* Platform Title */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Brain className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />
        </div>
        <div>
          <h1 className="font-semibold text-lg tracking-wider text-purple-400">ACPIA</h1>
          <p className="text-zinc-500 uppercase tracking-widest" style={{ fontSize: "10px" }}>Investigation Copilot</p>
        </div>
      </div>

      {/* Case Selector Dropdown */}
      <div className="sidebar-case-selector">
        <div className="case-selector-label-container">
          <label className="case-selector-label">Active Investigation</label>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-add-case"
            title="Create New Case"
          >
            <Plus style={{ height: "1rem", width: "1rem" }} />
          </button>
        </div>
        <button 
          onClick={() => setShowCaseDropdown(!showCaseDropdown)}
          className="case-selector-btn"
        >
          <div className="case-selector-content">
            <Layers className="case-selector-icon" style={{ height: "1rem", width: "1rem" }} />
            <span className="truncate">{activeCase.name}</span>
          </div>
          <ChevronDown className="case-selector-arrow" style={{ height: "1rem", width: "1rem" }} />
        </button>

        {showCaseDropdown && (
          <div className="case-dropdown">
            {cases.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCaseChange(c.id)}
                className={`case-dropdown-item ${activeCaseId === c.id ? "active" : ""}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const currentCaseQuery = `?case_id=${activeCaseId}`;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={`${item.href}${currentCaseQuery}`}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon style={{ height: "1.25rem", width: "1.25rem" }} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & Log Out */}
      <div className="sidebar-profile">
        <div className="profile-container">
          <div className="profile-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="profile-username">{username}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="btn-logout"
        >
          Log Out
        </button>
      </div>

      {/* Safety Notice footer */}
      <div className="sidebar-safety">
        <div className="safety-warning">
          <AlertTriangle className="text-destructive flex-shrink-0" style={{ height: "1rem", width: "1rem", marginTop: "0.125rem" }} />
          <p className="safety-text">
            Authorized Personnel Only. Actions logged for audit trail.
          </p>
        </div>
      </div>
      
      {/* Create Case Modal Overlay */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="font-bold text-white text-base">New Investigation Case</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="btn-modal-close"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleCreateCase}>
              <div className="form-group">
                <label className="form-label">Case Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Operation Safe Haven Phase 2"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  placeholder="Summarize target intelligence objectives..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  rows={3}
                  className="form-input"
                  style={{ resize: "none" }}
                />
              </div>
              <button 
                type="submit" 
                className="btn-submit-case"
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
