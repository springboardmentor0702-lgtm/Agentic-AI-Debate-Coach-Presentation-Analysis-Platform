import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, CheckCircle2, Save } from 'lucide-react';
export const ProfilePage = () => {
    const { user } = useAuth();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [experience, setExperience] = useState(user?.experience_level || 'intermediate');
    const [participate, setParticipate] = useState(user?.participate_in_comparison ?? true);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.updateProfile({
                full_name: fullName,
                username,
                experience_level: experience,
                participate_in_comparison: participate
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        catch (err) {
            console.error('Failed to update profile:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6 max-w-2xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-amber-400"/>
          Rhetorical Profile & Account Settings
        </h1>
        <p className="text-xs text-slate-400">
          Manage your tournament handle, competence tier, and privacy configurations.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Immutable ID)</label>
          <input type="email" disabled value={user?.email || ''} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal / Tournament Name</label>
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Handle / Username</label>
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Experience Tier</label>
            <select value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert / Varsity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Role</label>
            <input type="text" disabled value={user?.role?.toUpperCase() || 'LEARNER'} className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-amber-400 font-bold capitalize cursor-not-allowed"/>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <input type="checkbox" id="participate-check" checked={participate} onChange={(e) => setParticipate(e.target.checked)} className="rounded-sm bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500/30"/>
          <label htmlFor="participate-check" className="text-xs text-slate-300">
            Participate in anonymized peer benchmarking analytics
          </label>
        </div>

        {saved && (<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4"/>
            <span>Profile settings persisted successfully!</span>
          </div>)}

        <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20">
          <Save className="w-4 h-4"/>
          <span>{loading ? 'Updating...' : 'Save Profile Changes'}</span>
        </button>
      </form>
    </div>);
};
