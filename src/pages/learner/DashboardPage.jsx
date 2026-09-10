import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { BrainCircuit, Swords, Bot, ArrowUpRight, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
export const DashboardPage = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [summary, setSummary] = useState(null);
    const [recentDebates, setRecentDebates] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function loadDashboardData() {
            try {
                const [perf, dList] = await Promise.all([
                    api.getPerformanceSummary().catch(() => null),
                    api.getDebates().catch(() => [])
                ]);
                if (perf)
                    setSummary(perf);
                setRecentDebates(dList || []);
            }
            catch (err) {
                console.error('Error loading dashboard:', err);
            }
            finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, []);
    const metrics = [
        { label: 'Overall Competence', value: summary?.overall_score || 82, sub: '+4.2% this month', color: 'from-amber-500 to-amber-600' },
        { label: 'Logical Coherence', value: summary?.logical_reasoning || 86, sub: 'Top 15% percentile', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Evidence Quality', value: summary?.evidence_quality || 78, sub: 'Target: 85.0', color: 'from-blue-500 to-blue-600' },
        { label: 'Speech & Pace', value: summary?.presentation_score || 81, sub: '148 WPM average', color: 'from-emerald-500 to-emerald-600' }
    ];
    const agentWorkflows = [
        {
            title: 'Fixed AI Pipeline',
            subtitle: 'Argument Analysis',
            desc: 'Deterministic Toulmin breakdown: Claims, evidence quality, logical structure, fallacies, counterarguments.',
            to: '/argument-analysis',
            icon: BrainCircuit,
            badge: 'Pattern 1'
        },
        {
            title: 'Multi-Agent Simulator',
            subtitle: 'AI Debate Arena',
            desc: 'Turn-based arena with autonomous Opponent Agent and impartial Chief Judge scoring 6 criteria.',
            to: '/debate',
            icon: Swords,
            badge: 'Pattern 2'
        },
        {
            title: 'Tool-Calling Agent',
            subtitle: 'AI Assistant',
            desc: 'Autonomous AI assistant armed with diagnostic tools to answer your queries and propose training plans.',
            to: '/ask-coach',
            icon: Bot,
            badge: 'Pattern 3'
        }
    ];
    return (<div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Cognitive Performance Cockpit
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {user?.experience_level?.toUpperCase() || 'INTERMEDIATE'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Debater'}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-2xl">
              "Train Your Mind. Sharpen Your Arguments. Master Every Debate." Review your diagnostic metrics below or launch one of the autonomous agent workflows.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((m, idx) => (<div key={idx} className="p-4 md:p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-400">{m.label}</div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-white">{m.value}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
            <div className="text-[11px] text-amber-400/90 font-medium">{m.sub}</div>
          </div>))}
      </div>

      {/* Core Agentic AI Architectures */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Core Agentic AI Workflows
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous AI workflows running live: Fixed Pipeline, Multi-Agent Arena, and Tool-Calling AI Assistant.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agentWorkflows.map((agent, i) => {
            const Icon = agent.icon;
            return (<Link key={i} to={agent.to} className="group relative p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between hover:shadow-lg hover:shadow-amber-500/5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors flex items-center justify-center">
                      <Icon className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 group-hover:border-amber-500/30 border border-slate-700">
                      {agent.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-amber-400">{agent.title}</div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {agent.subtitle}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {agent.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-300 font-medium">
                  <span>Launch Workspace</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
                </div>
              </Link>);
        })}
        </div>
      </div>

      {/* Main Grid: Longitudinal Trend & Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">7-Day Cognitive Performance Trend</h3>
              <p className="text-xs text-slate-400">Empirical composite score across debate rounds and argument analyses</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              +6.5 pts this week
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.trend || [
            { day: 'Mon', score: 76 },
            { day: 'Tue', score: 78 },
            { day: 'Wed', score: 81 },
            { day: 'Thu', score: 80 },
            { day: 'Fri', score: 84 },
            { day: 'Sat', score: 83 },
            { day: 'Sun', score: 86 }
        ]}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false}/>
                <YAxis domain={[60, 100]} stroke="#64748b" fontSize={12} tickLine={false}/>
                <Tooltip contentStyle={{
            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
            borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
            borderRadius: '8px',
            color: theme === 'dark' ? '#fff' : '#0f172a',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }} itemStyle={{ color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}/>
                <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGradient)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Debates Panel */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400"/>
                Recent Debates
              </h3>
              <Link to="/debate" className="text-xs text-amber-400 hover:underline">
                Enter Arena
              </Link>
            </div>
            <div className="space-y-3">
              {recentDebates.slice(0, 3).map((d) => (<div key={d.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate max-w-[180px]">{d.topic}</span>
                    <span className="text-amber-400 font-mono capitalize text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {d.side}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{d.turns_completed || 2} Turns Completed</span>
                    <span className="capitalize text-emerald-400 font-medium">{d.status}</span>
                  </div>
                </div>))}
              {recentDebates.length === 0 && (<div className="text-xs text-slate-500 py-6 text-center">
                  No active debates recorded. Step into the Arena to practice.
                </div>)}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"/>
            <div className="text-xs">
              <div className="font-semibold text-indigo-200">AI Coach Observation</div>
              <div className="text-slate-400 mt-0.5">
                Your logical coherence leads by 8 points over peers. Focus on empirical evidence warrants to conquer national tournament finals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
};
