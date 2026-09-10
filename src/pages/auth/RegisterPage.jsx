import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Swords, ArrowRight } from 'lucide-react';
export const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        username: '',
        role: 'learner',
        experience_level: 'intermediate'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await register(formData);
            navigate('/dashboard');
        }
        catch (err) {
            setError(err.message || 'Registration failed');
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Create Your Account</h1>
        <p className="mt-1 text-xs text-slate-400">Join MindArena AI to sharpen your critical thinking and rhetoric</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (<div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>)}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300">Full Name</label>
              <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Elena Rostova" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Username</label>
              <input type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="elena_r" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Email Address</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="elena@example.com" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"/>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50">
                  <option value="learner">Learner</option>
                  <option value="coach">Coach</option>
                  <option value="educator">Educator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Experience</label>
                <select value={formData.experience_level} onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20">
              <span>{loading ? 'Creating Account...' : 'Register'}</span>
              <ArrowRight className="w-4 h-4"/>
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-amber-400 hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>);
};
