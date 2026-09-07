"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      const { access_token } = response.data;
      Cookies.set("token", access_token, { expires: 1 });
      
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* LOGO & TITLE */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg shadow-indigo-600/30">
            V
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Sign in to Veritas AI
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your debate chamber, speech telemetry, and AI coach audits
          </p>
        </div>

        {/* AUTH CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                placeholder="name@organization.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              {loading ? "Authenticating..." : "Sign In to Command Center"}
            </button>
          </form>

          {/* ONE-CLICK DEMO TEST ACCOUNTS */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Quick 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("learner@example.com", "learner123")}
                className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs transition-colors"
              >
                <span className="font-bold block text-slate-800 dark:text-slate-200">Learner</span>
                <span className="text-[10px] text-slate-400">learner@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("coach@example.com", "coach123")}
                className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs transition-colors"
              >
                <span className="font-bold block text-slate-800 dark:text-slate-200">Coach</span>
                <span className="text-[10px] text-slate-400">coach@example.com</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            Don't have an institutional account?{" "}
            <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Create New Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
