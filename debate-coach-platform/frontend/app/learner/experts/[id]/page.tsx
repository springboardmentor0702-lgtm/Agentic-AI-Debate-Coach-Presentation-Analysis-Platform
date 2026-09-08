"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ExpertProfile, getExpertProfile } from "@/services/auth";

export default function ExpertProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getExpertProfile(Number(id)).then(setExpert).catch((value: Error) => setError(value.message));
  }, [id]);

  return <main className="min-h-screen bg-slate-100 p-6 pt-20 lg:p-10"><div className="mx-auto max-w-2xl space-y-6"><Link href="/debates" className="text-teal-700 hover:text-teal-800">Back to debate history</Link><section className="rounded-2xl bg-white p-8 shadow-sm">{error ? <p className="text-rose-600">{error}</p> : expert ? <><p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Expert profile</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">{expert.full_name}</h1><dl className="mt-8 space-y-4"><div><dt className="text-sm font-medium text-slate-500">Email</dt><dd className="mt-1 text-slate-900">{expert.email}</dd></div><div><dt className="text-sm font-medium text-slate-500">Experience</dt><dd className="mt-1 text-slate-900">{expert.experience_level}</dd></div><div><dt className="text-sm font-medium text-slate-500">Coaching preferences</dt><dd className="mt-1 text-slate-900">{expert.coaching_preferences || "Not provided"}</dd></div><div><dt className="text-sm font-medium text-slate-500">Presentation domains</dt><dd className="mt-1 text-slate-900">{expert.presentation_domains || "Not provided"}</dd></div></dl><Link href={`/debates?expert=${expert.id}`} className="mt-8 inline-flex rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white">Request a debate</Link></> : <p className="text-slate-600">Loading expert profile...</p>}</section></div></main>;
}
