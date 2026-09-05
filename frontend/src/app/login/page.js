"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, storeAuth } from '../../lib/api';

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeSlashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [role, setRole] = useState('Learner');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const rolesList = ['Learner', 'Debate Coach', 'Educator', 'Administrator'];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.role !== role) {
        throw new Error(`Access denied. Registered role is '${data.role}', not '${role}'.`);
      }

      storeAuth(data);
      setMessage({ type: 'success', text: `Access granted! Redirecting to dashboard...` });
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', position: 'relative' }}>
      
      {/* Aurora Ambient Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {message && (
        <div style={{ maxWidth: '440px', width: '100%', marginBottom: '1.5rem', padding: '0.9rem 1.25rem', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 600, background: message.type === 'error' ? 'rgba(254, 242, 242, 0.9)' : 'rgba(236, 253, 245, 0.9)', backdropFilter: 'blur(12px)', color: message.type === 'error' ? '#dc2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#6ee7b7'}`, textAlign: 'center', zIndex: 1 }}>
          {message.text}
        </div>
      )}

      {/* iOS Glass Login Card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <img 
              src="/logo.png" 
              alt="LOGOS.AI" 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '18px', 
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
                border: '1.5px solid rgba(255, 255, 255, 0.5)'
              }} 
            />
          </div>
          <div className="badge-red-pill" style={{ marginBottom: '0.75rem' }}>
            <span className="badge-dot"></span> SECURE AUTHENTICATION
          </div>
          <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Login to <span className="text-gradient">LOGOS.AI</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Enter your credentials to access your debate cockpit.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Role Dropdown */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Select Role
            </label>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            >
              <span>{role}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>▼</span>
            </div>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                borderRadius: '14px',
                boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.12)',
                zIndex: 20,
                overflow: 'hidden',
              }}>
                {rolesList.map((r) => (
                  <div
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: role === r ? 700 : 500,
                      color: role === r ? 'var(--ios-indigo)' : '#334155',
                      background: role === r ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-red"
            style={{ width: '100%', padding: '0.9rem', fontSize: '0.92rem' }}
          >
            {loading ? 'AUTHENTICATING…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--ios-indigo)', fontWeight: 700 }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
