"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { apiFetch, clearAuth } from '../lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('logos_ai_jwt');
      setIsLoggedIn(!!token);
      if (token) {
        fetchNotifications();
      }
    };

    checkLoginStatus();
    
    // Set interval to poll notifications periodically
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
        setIsLoggedIn(false);
      }
      setNotifications([]);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/read/${id}`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      // Keep the item unread when the server rejects the update.
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      // Keep the current state when the server rejects the update.
    }
  };

  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setShowDropdown(false);
    router.push('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 3rem', background: '#fff', borderBottom: '1px solid #e5e5eb', position: 'relative', zIndex: 100 }}>
      <Link href="/" className="brand-logo" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>
        LOGOS.AI
      </Link>

      {/* Nav Links */}
      <div className="nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link href="/#engines" className="nav-link">
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
        {isLoggedIn && (
          <Link href="/notifications" className={`nav-link ${pathname === '/notifications' ? 'active' : ''}`}>
            ALERTS
          </Link>
        )}
        
        <Link href="/simulation" className="btn btn-red" style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', borderRadius: '4px' }}>
          DEPLOY_AGENT
        </Link>
      </div>

      {/* Actions / Notifications */}
      <div className="nav-actions" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        
        {/* Interactive Notification Bell */}
        {isLoggedIn && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', position: 'relative', padding: '0.25rem' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent-red)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.35rem', borderRadius: '50%' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: '#fff', border: '1px solid #e5e5eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5eb', paddingBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem' }}>NOTIFICATIONS ({unreadCount})</strong>
                  <button 
                    onClick={handleMarkAllAsRead}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear All
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', textAlign: 'center', padding: '1.5rem 0' }}>
                    No active notifications.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleMarkAsRead(notif.id)}
                        style={{ 
                          padding: '0.6rem 0.75rem', 
                          background: notif.read ? '#fff' : '#F9FAFB', 
                          borderLeft: `3px solid ${notif.read ? '#e5e5eb' : 'var(--accent-red)'}`,
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 800, textTransform: 'uppercase' }}>
                            {notif.category}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{notif.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: notif.read ? 500 : 700, color: '#111827', marginBottom: '0.1rem' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4B5563', lineHeight: '1.3' }}>
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

        {isLoggedIn ? (
          <button 
            onClick={handleLogout}
            className="btn btn-login" 
            style={{ padding: '0.55rem 1.25rem', border: '1px solid #e5e5eb', borderRadius: '4px', background: 'transparent', color: '#000', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="btn btn-login" style={{ padding: '0.55rem 1.25rem', border: '1px solid #e5e5eb', borderRadius: '4px', background: 'transparent', color: '#000', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
              Login
            </Link>
            <Link href="/signup" className="btn btn-dark" style={{ padding: '0.55rem 1.25rem', borderRadius: '4px', background: '#18181b', color: '#fff', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
