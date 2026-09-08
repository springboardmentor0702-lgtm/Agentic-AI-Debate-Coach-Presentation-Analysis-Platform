import type { Metadata } from "next";
import "./globals.css";
import AuthenticatedShell from "@/components/AuthenticatedShell";

export const metadata: Metadata = {
  title: "Agentic AI Debate Coach",
  description: "Debate coaching and presentation analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AuthenticatedShell>{children}</AuthenticatedShell></body>
    </html>
  );
}

