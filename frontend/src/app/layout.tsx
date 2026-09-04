import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-200`}>
        <header className="sticky top-0 z-50 bg-indigo-950 text-white shadow-md border-b border-indigo-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-sm">
                  ⚡
                </div>
                <Link href="/dashboard" className="font-bold text-lg tracking-tight hover:text-indigo-200 transition-colors">
                  AI Debate Coach
                </Link>
              </div>

              <nav className="hidden md:flex space-x-1 lg:space-x-2 text-sm font-medium">
                <Link href="/dashboard" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  Dashboard
                </Link>
                <Link href="/analyze" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  Argument Analysis
                </Link>
                <Link href="/simulation" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  AI Debate Sim
                </Link>
                <Link href="/presentation" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  Presentation Analytics
                </Link>
                <Link href="/coaching" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  Coaching & Skills
                </Link>
                <Link href="/reports" className="hover:bg-indigo-900/80 px-3 py-2 rounded-md transition-colors">
                  Reports
                </Link>
              </nav>

              <div className="flex items-center space-x-2.5 sm:space-x-3 text-sm">
                <ThemeToggle />
                <Link
                  href="/login"
                  className="bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
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

        <footer className="border-t py-6 text-center text-xs">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Agentic AI Debate Coach & Presentation Analysis Platform</span>
            <span>Intelligent Argument Mining & Speech Analytics</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
