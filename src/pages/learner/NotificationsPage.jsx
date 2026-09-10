import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bell, CheckCheck, Clock, Award, MessageSquareQuote } from 'lucide-react';
export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadNotifications();
    }, []);
    async function loadNotifications() {
        try {
            const list = await api.getNotifications();
            setNotifications(list || []);
        }
        catch (err) {
            console.error('Error loading notifications:', err);
        }
        finally {
            setLoading(false);
        }
    }
    const markAsRead = async (id) => {
        try {
            await api.markNotificationRead(id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        }
        catch (err) {
            console.error('Failed to mark read:', err);
        }
    };
    const getIcon = (type) => {
        switch (type) {
            case 'debate_invite':
                return <Award className="w-4 h-4 text-amber-400"/>;
            case 'coach_feedback':
                return <MessageSquareQuote className="w-4 h-4 text-indigo-400"/>;
            default:
                return <Bell className="w-4 h-4 text-emerald-400"/>;
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400"/>
            Activity Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-400">
            Debate invites, coach evaluations, analysis results, and round completions.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (<div key={n.id} className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${n.is_read
                ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                : 'bg-slate-900 border-amber-500/30 shadow-xs'}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-bold ${n.is_read ? 'text-slate-300' : 'text-white'}`}>
                    {n.title}
                  </h3>
                  {!n.is_read && (<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>)}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                  <Clock className="w-3 h-3"/>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {!n.is_read && (<button onClick={() => markAsRead(n.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0" title="Mark as Read">
                <CheckCheck className="w-4 h-4 text-emerald-400"/>
              </button>)}
          </div>))}

        {notifications.length === 0 && (<div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            No unread notifications at this time.
          </div>)}
      </div>
    </div>);
};
