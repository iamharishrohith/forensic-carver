"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, ShieldAlert, Lock, User, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch("http://127.0.0.1:8000/api/v1/auth/token", {
        method: "POST",
        body: formData, // OAuth2 request uses form urlencoded/formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid credentials. Check spelling.");
      }

      const data = await response.json();
      
      // Store token in localStorage
      localStorage.setItem("acpia_token", data.access_token);
      localStorage.setItem("acpia_user", username);
      
      // Redirect to dashboard
      router.push(`/?case_id=1`);
    } catch (err: any) {
      setError(err.message || "Could not connect to authentication services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 cyber-grid">
      {/* Glow Backdrop */}
      <div className="absolute h-96 w-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none"></div>

      <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-zinc-800 space-y-6 relative z-10 shadow-2xl">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-purple-600/20 rounded-xl border border-purple-500/30 flex items-center justify-center">
            <Brain className="h-6 w-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-white">ACPIA LOGIN</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Authorized Forensic Personnel Only</p>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-600" />
              <input 
                type="text" 
                required
                placeholder="e.g. investigator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-600" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg text-white focus:outline-none flex items-center justify-center"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Authenticate Session</span>
            )}
          </button>
        </form>

        {/* Demo details */}
        <div className="border-t border-zinc-900 pt-4 text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Access Keys</span>
          <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-lg text-[11px] text-zinc-500 font-mono mt-2 space-y-1">
            <div>User: <span className="text-zinc-400">investigator</span></div>
            <div>Pass: <span className="text-zinc-400">investigatorpassword</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
