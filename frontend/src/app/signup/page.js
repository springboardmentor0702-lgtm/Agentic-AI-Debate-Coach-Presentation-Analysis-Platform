"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, {
        name,
        email,
        password,
        role
      });

      const { access_token } = response.data;
      Cookies.set("token", access_token, { expires: 1 });
      
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const rolesList = [
    { id: "learner", label: "Learner / Debater", desc: "Practice debates, track metrics, build speaking skills" },
    { id: "coach", label: "Debate Coach", desc: "Guide debaters, review telemetry, formulate drills" },
    { id: "educator", label: "Educator / Faculty", desc: "Oversee classrooms, monitor cohorts, review leaderboards" },
    { id: "admin", label: "Administrator", desc: "Platform operations, model telemetry, institutional audits" }
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6">
        
        {/* LOGO & TITLE */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-indigo-600/30">
            V
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Create Institutional Account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select your role to access role-tailored debate simulations & telemetry
          </p>
        </div>

        {/* SIGNUP CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                placeholder="e.g. Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                placeholder="name@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* ROLE SELECTION */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Primary Platform Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rolesList.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`cursor-pointer p-3 rounded-2xl border transition-all text-left ${
                      role === r.id
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <strong className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                      {r.label}
                    </strong>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                      {r.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-bold text-sm shadow-md shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
            >
              {loading ? "Creating Account..." : "Create Account & Enter Platform"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2">
            Already registered?{" "}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
