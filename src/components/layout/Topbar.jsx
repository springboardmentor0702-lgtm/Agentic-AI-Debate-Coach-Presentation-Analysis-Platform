import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, Sun, Moon, LogOut, UserCheck, ChevronDown } from 'lucide-react';
export const Topbar = ({ onToggleSidebar }) => {
    const { user, logout, switchRolePersona } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const roles = [
        { role: 'learner', label: 'Learner', desc: 'Debater & presentation trainee' },
        { role: 'coach', label: 'Debate Coach', desc: 'Reviews & assigns feedback' },
        { role: 'educator', label: 'Educator', desc: 'Manages cohorts & classes' },
        { role: 'admin', label: 'Admin', desc: 'Telemetry & user roles' }
    ];
    const getRoleBadgeStyle = (r) => {
        switch (r) {
            case 'coach':
                return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            case 'educator':
                return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
            case 'admin':
                return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
            default:
                return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
        }
    };
    return (<header id="topbar" className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 flex items-center justify-between text-slate-200">
      <div className="flex items-center gap-3">
        <button id="toggle-sidebar-btn" onClick={onToggleSidebar} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden" aria-label="Toggle Navigation">
          <Menu className="w-5 h-5"/>
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Workspace:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(user?.role)}`}>
            {user?.role || 'Learner'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Persona Switcher */}
        <div className="relative">
          <button id="role-switcher-btn" onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors">
            <UserCheck className="w-3.5 h-3.5 text-amber-400"/>
            <span className="hidden lg:inline">Switch Role:</span>
            <span className="capitalize font-semibold text-amber-300">{user?.role}</span>
            <ChevronDown className="w-3 h-3 text-slate-400"/>
          </button>

          {showRoleDropdown && (<div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100" onMouseLeave={() => setShowRoleDropdown(false)}>
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                Switch Persona for Demo
              </div>
              {roles.map((r) => (<button key={r.role} onClick={() => {
                    switchRolePersona(r.role);
                    setShowRoleDropdown(false);
                }} className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors ${user?.role === r.role
                    ? 'bg-amber-500/10 text-amber-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'}`}>
                  <span className="capitalize font-medium">{r.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{r.desc}</span>
                </button>))}
            </div>)}
        </div>


        {/* Dark/Light Theme Toggle */}
        <motion.button id="theme-toggle-btn" onClick={toggleTheme} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700/50 shadow-xs cursor-pointer focus:outline-hidden" title={theme === 'dark' ? 'Turn smoothly into Light Mode' : 'Turn smoothly into Dark Mode'} aria-label={theme === 'dark' ? 'Turn smoothly into Light Mode' : 'Turn smoothly into Dark Mode'}>
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (<motion.div key="sun-icon" initial={{ rotate: -70, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 70, scale: 0.4, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]"/>
              </motion.div>) : (<motion.div key="moon-icon" initial={{ rotate: 70, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: -70, scale: 0.4, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="flex items-center justify-center">
                <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300 drop-shadow-[0_0_6px_rgba(51,65,85,0.25)]"/>
              </motion.div>)}
          </AnimatePresence>
        </motion.button>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
              {user?.full_name || 'Debater'}
            </span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role}</span>
          </div>
          <button id="logout-btn" onClick={logout} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1" title="Sign Out">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </header>);
};
