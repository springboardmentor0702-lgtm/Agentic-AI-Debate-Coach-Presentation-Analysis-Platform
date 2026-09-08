"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLearners, Person } from "@/services/auth";

export default function LearnerDirectoryPage() {
  const [learners, setLearners] = useState<Person[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void getLearners().then(setLearners).catch((value: Error) => setError(value.message));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 pt-20 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Expert workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Learner profiles</h1>
          <p className="mt-2 text-slate-600">Select a learner to review progress, start a debate, and provide guidance.</p>
        </header>
        {error ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">{error}</p> : null}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {learners.map((learner) => (
            <Link key={learner.id} href={`/expert/learners/${learner.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-500 hover:shadow-md">
              <p className="font-semibold text-slate-900">{learner.full_name}</p>
              <p className="mt-2 text-sm text-slate-500">{learner.email}</p>
              <p className="mt-4 text-sm font-medium text-teal-700">Open profile</p>
            </Link>
          ))}
          {!learners.length && !error ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">No active learners available.</p> : null}
        </section>
      </div>
    </main>
  );
}
