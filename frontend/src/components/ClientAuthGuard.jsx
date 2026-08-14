"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { Suspense } from "react";

export default function ClientAuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      setAuthenticated(true);
    }
    return () => { isMounted = false; };
  }, [pathname, router]);

  if (authenticated === null && pathname !== "/login") {
    return (
      <div className="full-screen-loader">
        <div className="loader-content">
          <div className="loader-spinner"></div>
          <p className="loader-text">Verifying authorized session...</p>
        </div>
      </div>
    );
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Suspense fallback={
        <div style={{ width: "16rem", backgroundColor: "#18181b", borderRight: "1px solid var(--border)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>Loading system...</span>
        </div>
      }>
        <Sidebar />
      </Suspense>
      
      {/* Main Content Area */}
      <main className="app-main cyber-grid">
        <div className="scroll-container">
          <Suspense fallback={
            <div className="full-screen-loader" style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}>
              <div className="loader-content">
                <div className="loader-spinner"></div>
                <p className="loader-text">Loading investigation records...</p>
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
