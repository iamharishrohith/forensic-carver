import ClientAuthGuard from "@/components/ClientAuthGuard";
import "./globals.css";

export const metadata = {
  title: "ACPIA – Agentic Child Protection Investigation Assistant",
  description: "AI-Powered Digital Evidence Intelligence Platform for Child Protection Investigations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientAuthGuard>
          {children}
        </ClientAuthGuard>
      </body>
    </html>
  );
}
