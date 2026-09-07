import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Mic, Award, BookOpen, BarChart3, ShieldAlert, FileText, 
  Bell, User, LogOut, Sparkles, ChevronDown, Check, Compass
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, demoLogin } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.warn("Notifications load error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const switchRole = async (targetRole) => {
    setShowRoleMenu(false);
    await demoLogin(targetRole);
    setActiveTab("dashboard");
  };

  const roles = [
    { label: "Learner", key: "Learner", color: "bg-blue-600 text-blue-100" },
    { label: "Debate Coach", key: "Debate Coach", color: "bg-purple-600 text-purple-100" },
    { label: "Educator", key: "Educator", color: "bg-emerald-600 text-emerald-100" },
    { label: "Administrator", key: "Administrator", color: "bg-amber-600 text-amber-100" }
  ];

  const currentRoleInfo = roles.find(r => r.key === user?.role) || roles[0];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "studio", label: "AI Debate Studio", icon: Mic, badge: "Live AI" },
    { id: "presentation", label: "Presentation Lab", icon: Compass },
    { id: "argument-lab", label: "Argument & Fallacies", icon: ShieldAlert },
    { id: "pathways", label: "Coaching Pathways", icon: BookOpen },
    { id: "reports", label: "Reports & Export", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">Debate AI</span>
              </div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Agentic Intelligence Platform
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 relative ${
                    isActive 
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right actions: Role Switcher, Notification, Profile */}
          <div className="flex items-center gap-3">
            
            {/* Instant Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all shadow-sm"
              >
                <span className={`w-2 h-2 rounded-full ${user?.role === "Administrator" ? "bg-amber-400" : user?.role === "Educator" ? "bg-emerald-400" : user?.role === "Debate Coach" ? "bg-purple-400" : "bg-blue-400"}`}></span>
                <span>Role: <strong className="text-white">{user?.role || "Learner"}</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Active Persona:
                  </div>
                  {roles.map(r => (
                    <button
                      key={r.key}
                      onClick={() => switchRole(r.key)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition-colors ${user?.role === r.key ? "text-blue-400 font-semibold" : "text-slate-200"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.color}`}>
                          {r.label}
                        </span>
                      </div>
                      {user?.role === r.key && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 relative transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-4">No recent notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-lg text-xs border ${n.is_read ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-blue-950/40 border-blue-800/50 text-slate-200"}`}>
                          <div className="font-semibold text-white mb-0.5">{n.title}</div>
                          <div className="text-[11px] leading-relaxed">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-white">{user?.full_name || "User"}</div>
                <div className="text-[10px] text-slate-400">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-700 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
