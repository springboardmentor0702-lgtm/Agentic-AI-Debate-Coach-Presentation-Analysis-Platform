import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, GraduationCap, Award } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    { role: "Learner", name: "Alex Morgan", icon: Award, desc: "Practice debates & view scores", color: "hover:border-blue-500/60 bg-blue-950/20 text-blue-300" },
    { role: "Coach", name: "Marcus Sterling", icon: UserCheck, desc: "Review debaters & assign drills", color: "hover:border-purple-500/60 bg-purple-950/20 text-purple-300" },
    { role: "Educator", name: "Prof. Diana Vance", icon: GraduationCap, desc: "Cohort rankings & analytics", color: "hover:border-emerald-500/60 bg-emerald-950/20 text-emerald-300" },
    { role: "Admin", name: "System Admin", icon: ShieldCheck, desc: "Platform telemetry & user roles", color: "hover:border-amber-500/60 bg-amber-950/20 text-amber-300" },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/20 mb-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Debate AI</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1.5">
            Agentic coaching, logical reasoning & presentation intelligence
          </p>
        </div>

        {/* Quick 1-Click Demo Login Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Instant Role Access (1-Click Demo):</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">Zero Setup</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoRoles.map(d => {
              const Icon = d.icon;
              return (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => handleQuickLogin(d.role)}
                  className={`p-2.5 rounded-xl border border-slate-800 text-left transition-all ${d.color} flex flex-col justify-between`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{d.role}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Traditional Credentials Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@debate.ai"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Authenticating..." : "Sign In with Credentials"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-400 hover:underline font-semibold"
            >
              Register here
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
