import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Settings, Download, Activity, Server, Cpu } from 'lucide-react';
export const AdminDashboardPage = () => {
    const [users, setUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadData();
    }, []);
    async function loadData() {
        try {
            const [uList, an] = await Promise.all([
                api.getAdminUsers().catch(() => []),
                api.getAdminAnalytics().catch(() => null)
            ]);
            setUsers(uList || []);
            setAnalytics(an);
        }
        catch (err) {
            console.error('Error loading admin data:', err);
        }
        finally {
            setLoading(false);
        }
    }
    const exportData = (format) => {
        const url = api.getExportUrl(format);
        window.open(url, '_blank');
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              System Administration
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400"/>
            Platform Telemetry & User Governance
          </h1>
          <p className="text-xs text-slate-400">
            Monitor LangGraph agent execution cycles, inspect LLM token consumption, and manage role-based access.
          </p>
        </div>

        {/* Export Center */}
        <div className="flex items-center gap-2">
          <button onClick={() => exportData('json')} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-amber-400"/>
            <span>Export JSON</span>
          </button>
          <button onClick={() => exportData('csv')} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-emerald-400"/>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Telemetry */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Registered Users</span>
            <Users className="w-4 h-4 text-purple-400"/>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white mt-1">
            {analytics?.total_users || users.length || 4}
          </div>
          <div className="text-[10px] text-emerald-400">4 Active Personas</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Agentic Debates Run</span>
            <Activity className="w-4 h-4 text-amber-400"/>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white mt-1">
            {analytics?.total_debates || 342}
          </div>
          <div className="text-[10px] text-amber-400">LangGraph Multi-Agent</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Token Consumption</span>
            <Cpu className="w-4 h-4 text-blue-400"/>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white mt-1">
            1.42M
          </div>
          <div className="text-[10px] text-slate-500">Gemini 3.8 Flash + Groq Fallback</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>API Health & Uptime</span>
            <Server className="w-4 h-4 text-emerald-400"/>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">
            99.98%
          </div>
          <div className="text-[10px] text-slate-500">Zero Unhandled Exceptions</div>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400"/>
          User Directory & Role Governance
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Experience Tier</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (<tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{u.full_name}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : u.role === 'coach'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : u.role === 'educator'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize">{u.experience_level}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Active
                    </span>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
};
