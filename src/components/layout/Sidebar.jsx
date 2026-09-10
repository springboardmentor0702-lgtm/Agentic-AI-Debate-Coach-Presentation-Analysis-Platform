import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, BrainCircuit, ShieldAlert, Swords, Mic, BookOpen, LineChart, User, Users, MessageSquareQuote, GraduationCap, Settings, Download, Bot } from 'lucide-react';
export const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const role = user?.role || 'learner';
    const learnerNav = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/argument-analysis', label: 'Argument Analysis', icon: BrainCircuit, badge: 'Pipeline' },
        { to: '/fallacy-detection', label: 'Fallacy Detection', icon: ShieldAlert },
        { to: '/counterarguments', label: 'Counterarguments', icon: MessageSquareQuote },
        { to: '/case-review', label: 'Case Review', icon: BookOpen },
        { to: '/debate', label: 'Debate Arena', icon: Swords, badge: 'Multi-Agent' },
        { to: '/presentation-analysis', label: 'Presentation & Voice', icon: Mic },
        { to: '/ask-coach', label: 'AI Assistant', icon: Bot, badge: 'Tools' },
        { to: '/performance', label: 'Performance & Peers', icon: LineChart },
        { to: '/profile', label: 'My Profile', icon: User }
    ];
    const coachNav = [
        { to: '/coach/dashboard', label: 'Coach Overview', icon: LayoutDashboard },
        { to: '/coach/learners', label: 'Assigned Learners', icon: Users },
        { to: '/coach/feedback', label: 'Feedback Queue', icon: MessageSquareQuote }
    ];
    const educatorNav = [
        { to: '/educator/dashboard', label: 'Cohort Overview', icon: LayoutDashboard },
        { to: '/educator/classes', label: 'Classes & Roster', icon: GraduationCap },
        { to: '/educator/analytics', label: 'Cohort Analytics', icon: LineChart }
    ];
    const adminNav = [
        { to: '/admin/dashboard', label: 'Admin Metrics', icon: LayoutDashboard },
        { to: '/admin/users', label: 'User Directory', icon: Users },
        { to: '/admin/analytics', label: 'AI Telemetry', icon: Settings },
        { to: '/admin/export', label: 'Authorized Export', icon: Download }
    ];
    const getActiveList = () => {
        switch (role) {
            case 'coach':
                return coachNav;
            case 'educator':
                return educatorNav;
            case 'admin':
                return adminNav;
            default:
                return learnerNav;
        }
    };
    const navItems = getActiveList();
    return (<>
      {/* Mobile Backdrop */}
      {isOpen && (<div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden" onClick={onClose}/>)}

      <aside id="sidebar" className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 ease-in-out bg-slate-900 border-r border-slate-800 text-slate-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo & Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">
            <Swords className="w-5 h-5 text-white"/>
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-base leading-tight">
              MindArena <span className="text-amber-400 font-extrabold">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Debate & Intel
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {role.toUpperCase()} WORKSPACE
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (<NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400"/>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (<span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-indigo-950 text-indigo-300 border border-indigo-700/50 uppercase tracking-wider font-semibold">
                    {item.badge}
                  </span>)}
              </NavLink>);
        })}
        </div>
      </aside>
    </>);
};
