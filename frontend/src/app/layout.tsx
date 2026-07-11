import type { Metadata } from "next";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACPIA – Agentic Child Protection Investigation Assistant",
  description: "AI-Powered Digital Evidence Intelligence Platform for Child Protection Investigations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex overflow-hidden">
        <ClientAuthGuard>
          {children}
        </ClientAuthGuard>
      </body>
    </html>
  );
}
