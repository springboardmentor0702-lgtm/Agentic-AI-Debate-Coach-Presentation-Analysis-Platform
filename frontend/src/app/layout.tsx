import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agentic AI Debate Coach & Presentation Analysis Platform",
  description: "Comprehensive platform for argument analysis, fallacy detection, debate simulations, and presentation intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col`}>
        <header className="sticky top-0 z-50 bg-indigo-900 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-sm">
                  ⚡
                </div>
                <Link href="/dashboard" className="font-bold text-lg tracking-tight hover:text-indigo-200 transition-colors">
                  AI Debate Coach
                </Link>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-800 text-indigo-300 rounded border border-indigo-700">
                  Agentic Platform
                </span>
              </div>

              <nav className="hidden md:flex space-x-1 lg:space-x-2 text-sm font-medium">
                <Link href="/dashboard" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  Dashboard
                </Link>
                <Link href="/analyze" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  Argument Analysis
                </Link>
                <Link href="/simulation" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  AI Debate Sim
                </Link>
                <Link href="/presentation" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  Presentation Analytics
                </Link>
                <Link href="/coaching" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  Coaching & Skills
                </Link>
                <Link href="/reports" className="hover:bg-indigo-800/80 px-3 py-2 rounded-md transition-colors">
                  Reports
                </Link>
              </nav>

              <div className="flex items-center space-x-3 text-sm">
                <Link
                  href="/login"
                  className="bg-indigo-700 hover:bg-indigo-600 px-3.5 py-1.5 rounded-md font-medium transition-colors shadow-sm"
                >
                  Sign In / Out
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Agentic AI Debate Coach & Presentation Analysis Platform</span>
            <span>Built with FastAPI & Next.js • 14 Integrated Intelligence Modules</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
