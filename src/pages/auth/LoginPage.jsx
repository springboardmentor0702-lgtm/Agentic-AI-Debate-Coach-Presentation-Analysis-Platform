import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Swords, ArrowRight, ShieldCheck, Users, GraduationCap, User } from 'lucide-react';
export const LoginPage = () => {
    const { login, switchRolePersona } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        }
        catch (err) {
            setError(err.message || 'Login failed');
        }
        finally {
            setLoading(false);
        }
    };
    const handleQuickDemo = async (role) => {
        setLoading(true);
        try {
            await switchRolePersona(role);
            if (role === 'coach')
                navigate('/coach/dashboard');
            else if (role === 'educator')
                navigate('/educator/dashboard');
            else if (role === 'admin')
                navigate('/admin/dashboard');
            else
                navigate('/dashboard');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-lg shadow-amber-500/20 mb-4">
          <Swords className="w-6 h-6 text-white"/>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Sign In to MindArena <span className="text-amber-400">AI</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Train Your Mind. Sharpen Your Arguments. Master Every Debate.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (<div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>)}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="learner@mindarena.ai" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20">
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4"/>
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <span className="block text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              1-Click Demo Evaluation Personas
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleQuickDemo('learner')} className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-400"/>
                <div className="text-[11px]">
                  <div className="font-semibold text-slate-200">Learner</div>
                  <div className="text-[9px] text-slate-400">Elena Rostova</div>
                </div>
              </button>

              <button type="button" onClick={() => handleQuickDemo('coach')} className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400"/>
                <div className="text-[11px]">
                  <div className="font-semibold text-slate-200">Coach</div>
                  <div className="text-[9px] text-slate-400">Marcus Vance</div>
                </div>
              </button>

              <button type="button" onClick={() => handleQuickDemo('educator')} className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400"/>
                <div className="text-[11px]">
                  <div className="font-semibold text-slate-200">Educator</div>
                  <div className="text-[9px] text-slate-400">Dr. Sarah Lin</div>
                </div>
              </button>

              <button type="button" onClick={() => handleQuickDemo('admin')} className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400"/>
                <div className="text-[11px]">
                  <div className="font-semibold text-slate-200">Admin</div>
                  <div className="text-[9px] text-slate-400">System Admin</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/register" className="text-xs text-amber-400 hover:underline">
              Don't have an account? Register here
            </Link>
          </div>
        </div>
      </div>
    </div>);
};
