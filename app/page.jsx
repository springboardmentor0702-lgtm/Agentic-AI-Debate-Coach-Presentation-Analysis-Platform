"use client";

import Link from "next/link";
import { Brain, ShieldAlert, BarChart3, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f0] text-black">
      <nav className="border-b border-gray-300 px-8 py-5 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          LOGOS<span className="text-red-600">.AI</span>
        </h1>

        <div className="flex gap-6 text-sm">
          <Link href="/analyze">Analyze</Link>
          <Link href="/reports">Reports</Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-8 py-24">
        <p className="text-red-600 font-bold text-sm tracking-widest">
          MILESTONE 02 · ARGUMENT INTELLIGENCE
        </p>

        <h2 className="text-6xl md:text-8xl font-black tracking-tight mt-5">
          Turn arguments
          <br />
          into <span className="text-red-600">evidence.</span>
        </h2>

        <p className="max-w-2xl text-gray-600 text-lg mt-8 leading-8">
          Analyze claims, evaluate evidence, detect logical fallacies,
          evaluate reasoning quality and generate actionable debate feedback.
        </p>

        <div className="flex gap-4 mt-8">
          <Link
            href="/analyze"
            className="bg-red-600 text-white px-6 py-3 font-bold flex items-center gap-2"
          >
            Start Analysis
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/reports"
            className="border border-gray-400 px-6 py-3 font-bold"
          >
            View Reports
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 grid md:grid-cols-3 gap-5 pb-20">
        <Feature
          icon={<Brain />}
          title="Argument Analysis"
          description="Identify claims, evidence, reasoning quality and argument strength."
        />

        <Feature
          icon={<ShieldAlert />}
          title="Fallacy Detection"
          description="Detect common logical fallacies and provide explanations."
        />

        <Feature
          icon={<BarChart3 />}
          title="Performance Scoring"
          description="Generate structured scores and actionable coaching feedback."
        />
      </section>
    </main>
  );
}

function Feature({ icon, title, description }) {
  return (
    <div className="bg-white border border-gray-300 p-7">
      <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
        {icon}
      </div>

      <h3 className="font-bold text-xl mt-6">{title}</h3>

      <p className="text-gray-600 mt-3 leading-7">
        {description}
      </p>
    </div>
  );
}
