import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veritas AI • Agentic Debate & Speech Intelligence Platform",
  description: "Enterprise debate simulations, argument mining, fallacy diagnostics, live speech analytics, and personalized coaching roadmaps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-200`}>
        <Navbar />

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm py-8 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                ⚡
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Veritas AI Platform
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] font-mono">v2.4.0 (Enterprise)</span>
            </div>

            <div className="flex items-center gap-6 text-[11px]">
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Command Center
              </Link>
              <Link href="/simulation" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Debate Arena
              </Link>
              <Link href="/presentation" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Speech Studio
              </Link>
              <Link href="/analyze" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Fallacy Diagnostic
              </Link>
              <Link href="/reports" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Export Audit Logs
              </Link>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All 14 Modules Operational</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
