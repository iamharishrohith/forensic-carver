"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Lock, User, AlertCircle } from "lucide-react";
import "./login.css";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch("http://127.0.0.1:8000/api/v1/auth/token", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid credentials. Check spelling.");
      }

      const data = await response.json();
      
      localStorage.setItem("acpia_token", data.access_token);
      localStorage.setItem("acpia_user", username);
      
      router.push(`/?case_id=1`);
    } catch (err) {
      setError(err.message || "Could not connect to authentication services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container cyber-grid">
      {/* Glow Backdrop */}
      <div className="login-glow"></div>

      <div className="glass-card max-w-md w-full p-8" style={{ borderRadius: "var(--radius)", position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Logo Header */}
        <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ margin: "0 auto", width: "3rem", height: "3rem", background: "rgba(139, 92, 246, 0.15)", borderRadius: "0.75rem", border: "1px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain className="text-purple-400" style={{ height: "1.5rem", width: "1.5rem" }} />
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-white">ACPIA LOGIN</h2>
          <p className="sidebar-label" style={{ textAlign: "center" }}>Authorized Forensic Personnel Only</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <AlertCircle style={{ height: "1.125rem", width: "1.125rem", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label className="sidebar-label">Username</label>
            <div style={{ position: "relative" }}>
              <User className="text-zinc-600" style={{ position: "absolute", left: "0.75rem", top: "0.875rem", height: "1.125rem", width: "1.125rem" }} />
              <input 
                type="text" 
                required
                placeholder="e.g. investigator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.5rem", width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label className="sidebar-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock className="text-zinc-600" style={{ position: "absolute", left: "0.75rem", top: "0.875rem", height: "1.125rem", width: "1.125rem" }} />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.5rem", width: "100%" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "0.75rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {loading ? (
              <div className="animate-spin" style={{ height: "1rem", width: "1rem", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }}></div>
            ) : (
              <span>Authenticate Session</span>
            )}
          </button>
        </form>

        {/* Demo details */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", textAlign: "center" }}>
          <span className="sidebar-label" style={{ textAlign: "center" }}>Access Keys</span>
          <div className="font-mono text-zinc-500" style={{ background: "rgba(9, 9, 11, 0.6)", border: "1px solid var(--border)", padding: "0.75rem", borderRadius: "0.5rem", fontSize: "11px", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div>User: <span className="text-zinc-400">investigator</span></div>
            <div>Pass: <span className="text-zinc-400">investigatorpassword</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
