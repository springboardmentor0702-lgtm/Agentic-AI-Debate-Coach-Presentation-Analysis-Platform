"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { apiFetch, clearAuth, getStoredUser } from '../lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const checkLoginStatus = () => {
      const stored = getStoredUser();
      if (stored?.access_token) {
        setUser(stored);
        fetchNotifications();
      } else {
        setUser(null);
      }
    };

    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications/my-alerts?limit=25');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        setUser(null);
      }
      setNotifications([]);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/read/${id}`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {}
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setShowDropdown(false);
    router.push('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="navbar">
      {/* Brand Logo with iOS 26 Glossy Icon */}
      <Link href="/" className="brand-logo-container">
        <div className="brand-logo-icon">
          <img 
            src="/logo.png" 
            alt="LOGOS.AI" 
            className="brand-logo-img" 
          />
        </div>
        <span className="brand-logo-text">LOGOS.AI</span>
      </Link>

      {/* Nav Links with iOS Glass Hover Pills */}
      <div className="nav-links">
        <Link href="/#engines" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          ENGINES
        </Link>
        <Link href="/simulation" className={`nav-link ${pathname === '/simulation' ? 'active' : ''}`}>
          SIMULATION
        </Link>
        <Link href="/presentation" className={`nav-link ${pathname === '/presentation' ? 'active' : ''}`}>
          VOCAL_METRICS
        </Link>
        <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
          ANALYTICS
        </Link>
        <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`}>
          REPORTS
        </Link>
        {user && (
          <Link href="/notifications" className={`nav-link ${pathname === '/notifications' ? 'active' : ''}`}>
            ALERTS
          </Link>
        )}
      </div>

      {/* Right Actions / User Profile Pill */}
      <div className="nav-actions">
        {/* Interactive Notification Bell with Glass Badge */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ 
                background: 'rgba(255, 255, 255, 0.75)', 
                border: '1px solid rgba(226, 232, 240, 0.8)', 
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.05rem', 
                cursor: 'pointer', 
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)', 
                  color: '#fff', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  padding: '0.12rem 0.38rem', 
                  borderRadius: '9999px',
                  boxShadow: '0 2px 6px rgba(244, 63, 94, 0.5)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* iOS Glass Notification Dropdown */}
            {showDropdown && (
              <div style={{ 
                position: 'absolute', 
                top: 'calc(100% + 8px)', 
                right: 0, 
                width: '340px', 
                background: 'rgba(255, 255, 255, 0.92)', 
                backdropFilter: 'blur(28px) saturate(190%)',
                WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                border: '1px solid rgba(255, 255, 255, 0.9)', 
                borderRadius: '20px',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(255, 255, 255, 0.7) inset', 
                padding: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem', 
                maxHeight: '420px', 
                overflowY: 'auto',
                zIndex: 1000
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.88rem', fontWeight: 800 }}>NOTIFICATIONS ({unreadCount})</strong>
                  <button 
                    onClick={handleMarkAllAsRead}
                    style={{ background: 'transparent', border: 'none', color: 'var(--ios-indigo)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark All Read
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>
                    ✨ You're all caught up!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleMarkAsRead(notif.id)}
                        style={{ 
                          padding: '0.7rem 0.85rem', 
                          background: notif.read ? 'rgba(255, 255, 255, 0.5)' : 'rgba(238, 242, 255, 0.85)', 
                          border: '1px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--ios-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>
                            {notif.category}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{notif.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: notif.read ? 600 : 800, color: '#0f172a', marginBottom: '0.15rem' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.35' }}>
                          {notif.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Pill / Login CTA */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Link 
              href="/dashboard" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.35rem 0.85rem 0.35rem 0.4rem',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                borderRadius: '9999px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)'
              }}>
                {(user.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.15, textAlign: 'left' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                  {user.full_name || 'User'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                  {user.role || 'Learner'}
                </div>
              </div>
            </Link>

            <button 
              onClick={handleLogout}
              className="btn btn-login" 
              style={{ padding: '0.45rem 1rem', fontSize: '0.75rem' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Link href="/login" className="btn btn-login">
              Login
            </Link>
            <Link href="/signup" className="btn btn-red">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
