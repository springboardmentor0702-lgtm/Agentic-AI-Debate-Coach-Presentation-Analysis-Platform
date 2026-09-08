"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { registerUser } from "@/services/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("LEARNER");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await registerUser({ full_name: fullName, email, password, role, admin_key: adminKey || undefined });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Register</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Create your account</h1>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Account type</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="LEARNER">Learner</option>
              <option value="DEBATE_EXPERT">Debate Expert</option>
              <option value="DEBATE_COACH">Debate Coach</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {role === "ADMIN" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Admin registration key</span>
              <input type="password" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </div>
      </form>
    </main>
  );
}
