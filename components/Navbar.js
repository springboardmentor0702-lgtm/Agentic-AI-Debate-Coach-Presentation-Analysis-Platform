"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

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
      const res = await fetch("http://localhost:8000/api/v1/notifications/my-alerts");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      // Offline fallback values
      setNotifications([
        {
          id: 1,
          category: "Session Reminder",
          title: "Upcoming Debate Match",
          message: "Your debate session on 'AI Governance' is scheduled in 30 minutes.",
          timestamp: "Just now",
          read: false
        },
        {
          id: 2,
          category: "Feedback Alert",
          title: "Analysis Ready",
          message: "Coach Sofia Vance left detailed feedback on your last debate rebuttal.",
          timestamp: "2 hours ago",
          read: false
        }
      ]);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await fetch(`http://localhost:8000/api/v1/notifications/read/${id}`, {
        method: "POST"
      });
    } catch (err) {}
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    setIsLoggedIn(false);
    setShowDropdown(false);
    router.push('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="navbar">
      <Link href="/" className="brand-logo">
        <span style={{ color: 'var(--accent-red)' }}>LOGOS</span>.AI
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
              <div className="glass" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', border: '1px solid var(--border-light)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>NOTIFICATIONS ({unreadCount})</strong>
                  <button 
                    onClick={() => {
                      notifications.forEach(n => handleMarkAsRead(n.id));
                    }}
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
                          background: notif.read ? 'transparent' : 'rgba(255, 51, 102, 0.05)', 
                          borderLeft: `3px solid ${notif.read ? 'var(--border-light)' : 'var(--accent-red)'}`,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          borderRadius: '0 4px 4px 0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 800, textTransform: 'uppercase' }}>
                            {notif.category}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{notif.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: notif.read ? 500 : 700, color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
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
          >
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="btn btn-login">
              Login
            </Link>
            <Link href="/signup" className="btn btn-dark">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
