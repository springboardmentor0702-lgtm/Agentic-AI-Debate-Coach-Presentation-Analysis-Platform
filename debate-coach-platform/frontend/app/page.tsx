import Link from "next/link";
import { Activity, Brain, MessageSquareText, Sparkles } from "lucide-react";

export default async function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7f5]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-[#24566a]">
          Debate Coach
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account navigation">
          <Link
            href="/login"
            className="rounded-xl border border-[#b9cbd2] bg-white/70 px-4 py-2 text-sm font-semibold text-[#24566a] hover:bg-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[#e76f51] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#e76f51]/20 hover:-translate-y-0.5 hover:bg-[#d85f43]"
          >
            Create account
          </Link>
        </nav>
      </header>
      <section className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
        <div className="relative z-10 space-y-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9ded8] bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#24566a] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#e76f51]" aria-hidden="true" />
              Agentic AI Debate Coach
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] text-[#102a43] md:text-6xl">
              Practice sharper arguments with AI feedback that stays accountable.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#486581]">
              Think clearly under pressure. Build your case, meet a stronger counterargument, and leave every session knowing exactly how to improve.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/debate/new"
              className="rounded-xl bg-[#24566a] px-6 py-3 font-semibold text-white shadow-lg shadow-[#24566a]/20 hover:-translate-y-0.5 hover:bg-[#163f50]"
            >
              Start a debate
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#b9cbd2] bg-white/70 px-6 py-3 font-semibold text-[#24566a] hover:-translate-y-0.5 hover:bg-white"
            >
              Go to dashboard
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: MessageSquareText, label: "Debate practice" },
              { icon: Brain, label: "Argument analysis" },
              { icon: Activity, label: "Progress tracking" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#d9e5e1] bg-white/80 p-4 shadow-sm">
                <item.icon className="h-6 w-6 text-[#e76f51]" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-[#102a43]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px] overflow-hidden rounded-[2rem] bg-[#102a43] p-6 shadow-2xl shadow-[#102a43]/20 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(120,194,189,0.24),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(231,111,81,0.24),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#78c2bd]">Live practice room</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Your thinking, challenged.</h2>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#d8efeb]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#78c2bd]" />AI ready</span>
            </div>

            <div className="relative mx-auto my-8 flex h-64 w-full max-w-md items-center justify-center">
              <div className="absolute h-52 w-52 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-[#78c2bd]/30" />
              <div className="absolute h-36 w-36 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-[#e76f51]/40" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#d8efeb]/30 bg-[#24566a] shadow-[0_0_70px_rgba(120,194,189,0.35)]">
                <Brain className="h-12 w-12 text-[#d8efeb]" aria-hidden="true" />
              </div>
              <span className="absolute left-[16%] top-[28%] h-3 w-3 rounded-full bg-[#e76f51] shadow-[0_0_18px_#e76f51]" />
              <span className="absolute right-[18%] bottom-[25%] h-3 w-3 rounded-full bg-[#78c2bd] shadow-[0_0_18px_#78c2bd]" />
              <span className="absolute right-[26%] top-[12%] h-2 w-2 rounded-full bg-white/80" />
            </div>

            <div className="space-y-3">
              <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-[#e76f51] px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-black/10">
                Climate action creates stronger long-term economic stability.
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-[#edf7f5]">
                What evidence shows the transition can protect jobs during the next decade?
              </div>
              <div className="flex items-center gap-2 pt-2 text-xs font-medium text-[#9fb8bf]"><Activity className="h-4 w-4 text-[#78c2bd]" aria-hidden="true" /><span className="flex gap-1"><i className="h-3 w-1 animate-pulse bg-[#78c2bd]" /><i className="h-5 w-1 animate-pulse bg-[#78c2bd] [animation-delay:120ms]" /><i className="h-4 w-1 animate-pulse bg-[#78c2bd] [animation-delay:240ms]" /><i className="h-6 w-1 animate-pulse bg-[#78c2bd] [animation-delay:360ms]" /></span> AI is listening for the strongest point</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

