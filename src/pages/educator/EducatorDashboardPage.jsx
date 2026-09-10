import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { GraduationCap, Users, Plus, CheckCircle2, UserPlus } from 'lucide-react';
export const EducatorDashboardPage = () => {
    const [classes, setClasses] = useState([]);
    const [newClassName, setNewClassName] = useState('');
    const [newClassDesc, setNewClassDesc] = useState('');
    const [learnerEmail, setLearnerEmail] = useState('');
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    useEffect(() => {
        loadClasses();
    }, []);
    async function loadClasses() {
        try {
            const res = await api.getClasses();
            setClasses(res || []);
            if (res && res.length > 0 && !selectedClassId) {
                setSelectedClassId(res[0].id);
            }
        }
        catch (err) {
            console.error('Error loading classes:', err);
        }
    }
    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!newClassName)
            return;
        try {
            const created = await api.createClass({
                name: newClassName,
                description: newClassDesc
            });
            setClasses((prev) => [created, ...prev]);
            setSelectedClassId(created.id);
            setNewClassName('');
            setNewClassDesc('');
            setSuccessMsg('New cohort created!');
            setTimeout(() => setSuccessMsg(null), 3000);
        }
        catch (err) {
            console.error('Create class failed:', err);
        }
    };
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedClassId || !learnerEmail)
            return;
        try {
            await api.addClassMember(selectedClassId, learnerEmail);
            setSuccessMsg(`Enrolled ${learnerEmail} into cohort!`);
            setLearnerEmail('');
            setTimeout(() => setSuccessMsg(null), 3000);
        }
        catch (err) {
            console.error('Add member failed:', err);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
            Educator Classroom Suite
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-400"/>
          Cohort Management & Academic Intelligence
        </h1>
        <p className="text-xs text-slate-400">
          Supervise student cohorts, observe collective fallacy patterns, and benchmark class-wide debate readiness.
        </p>
      </div>

      {successMsg && (<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4"/>
          <span>{successMsg}</span>
        </div>)}

      {/* Cohort KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400">Total Enrolled Debaters</div>
          <div className="text-2xl md:text-3xl font-black text-white mt-1">48</div>
          <div className="text-[10px] text-emerald-400">+12 this semester</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400">Class Average Score</div>
          <div className="text-2xl md:text-3xl font-black text-amber-400 mt-1">79.4</div>
          <div className="text-[10px] text-slate-500">Benchmark: 75.0</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400">Active Debates This Week</div>
          <div className="text-2xl md:text-3xl font-black text-blue-400 mt-1">112</div>
          <div className="text-[10px] text-slate-500">92% completion rate</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400">Top Detected Fallacy</div>
          <div className="text-xl md:text-2xl font-black text-rose-400 mt-1">Slippery Slope</div>
          <div className="text-[10px] text-slate-500">34% of identified flaws</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Cohort */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400"/>
            Create Academic Cohort
          </h2>
          <form onSubmit={handleCreateClass} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Class / Cohort Name</label>
              <input type="text" required placeholder="e.g. AP English Rhetoric - Fall 2026" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea rows={2} placeholder="Tournament preparation section..." value={newClassDesc} onChange={(e) => setNewClassDesc(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>
              <span>Create Cohort</span>
            </button>
          </form>
        </div>

        {/* Enroll Student */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400"/>
            Enroll Student in Cohort
          </h2>
          <form onSubmit={handleAddMember} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Cohort</label>
              <select value={selectedClassId || ''} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
                {classes.map((c) => (<option key={c.id} value={c.id}>
                    {c.name}
                  </option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Email</label>
              <input type="email" required placeholder="learner@mindarena.ai" value={learnerEmail} onChange={(e) => setLearnerEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5"/>
              <span>Enroll Student</span>
            </button>
          </form>
        </div>

        {/* Cohort Roster */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400"/>
            Active Cohort Roster
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            {classes.map((c) => (<div key={c.id} onClick={() => setSelectedClassId(c.id)} className={`p-3 rounded-lg border cursor-pointer transition-colors text-xs ${selectedClassId === c.id
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-200 font-semibold'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{c.description || 'Varsity debate section'}</div>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
};
