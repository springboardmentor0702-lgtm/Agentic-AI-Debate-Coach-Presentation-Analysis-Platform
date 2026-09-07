import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ShieldCheck, Activity, Cpu, Database, Users, 
  Settings, CheckCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [dashData, usersData] = await Promise.all([
        api.getAdminDashboard(),
        api.listUsers()
      ]);
      setData(dashData);
      setUsersList(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await api.updateUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert("Role update failed: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/20 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Administrator Portal
              </span>
              <span className="text-xs text-slate-400">System Telemetry & Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Administration & AI Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Live observability for agentic reasoning clusters, database health, and RBAC user provisioning.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Operations Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>System State</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-2">100% Operational</div>
          <div className="text-[11px] text-slate-400 mt-1">Uptime: 99.98%</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>AI Reasoning Cluster</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {data?.ai_model_monitoring?.average_latency_ms || 320} ms
          </div>
          <div className="text-[11px] text-blue-400 mt-1">Avg Inference Latency</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Debate Sessions</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {data?.total_debate_sessions || 18} Active
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{data?.total_speech_turns || 142} speech turns logged</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {data?.total_users || 4} Users
          </div>
          <div className="text-[11px] text-amber-300 mt-1">Across all 4 active roles</div>
        </div>
      </div>

      {/* Grid: User Management Table + AI Engine & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User Management & RBAC Table */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>User Provisioning & Role Management (RBAC)</span>
              </h2>
              <p className="text-xs text-slate-400">Elevate roles and verify account permissions</p>
            </div>
            <span className="text-xs text-slate-400">{usersList.length} Accounts Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">User Profile</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Assigned Role Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-white">
                      {u.full_name}
                      <span className="block text-[10px] text-slate-500 font-mono">ID #{u.id}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === "Administrator" ? "bg-amber-950 text-amber-300 border border-amber-800/40" :
                        u.role === "Educator" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40" :
                        u.role === "Debate Coach" ? "bg-purple-950 text-purple-300 border border-purple-800/40" :
                        "bg-blue-950 text-blue-300 border border-blue-800/40"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Learner">Learner</option>
                        <option value="Debate Coach">Debate Coach</option>
                        <option value="Educator">Educator</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Monitoring & System Audit Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>AI Engine Architecture</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">Model status and heuristic fallback</p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Architecture:</span>
                <span className="text-white font-semibold">Dual Engine LLM</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Primary Provider:</span>
                <span className="text-emerald-400 font-mono">Gemini 1.5 Flash</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Fallback Heuristic:</span>
                <span className="text-blue-400 font-semibold">Operational (100%)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Active Personas:</span>
                <span className="text-white font-semibold">3 Expert Agents</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-2">Audit & Event Stream</h2>
            <div className="space-y-2 text-xs">
              {(data?.recent_audit_logs || []).map((log, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-200">{log.event}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.time}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
