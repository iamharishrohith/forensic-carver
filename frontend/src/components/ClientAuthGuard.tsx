"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { Suspense } from "react";

export default function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check local storage for token - bypassed temporarily
    setAuthenticated(true);
  }, [pathname, router]);

  // Prevent flashing content while checking auth
  if (authenticated === null && pathname !== "/login") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Verifying authorized session...</p>
        </div>
      </div>
    );
  }

  // If on login page, render children directly without sidebar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100 flex overflow-hidden w-full">
      {/* Wrap Sidebar inside Suspense since it uses useSearchParams */}
      <Suspense fallback={
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-screen flex items-center justify-center">
          <span className="text-sm text-zinc-500">Loading system...</span>
        </div>
      }>
        <Sidebar />
      </Suspense>
      
      {/* Main Content Area */}
      <main className="flex-1 pl-64 h-screen overflow-y-auto cyber-grid relative">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-zinc-950">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-400 text-sm">Loading investigation records...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
