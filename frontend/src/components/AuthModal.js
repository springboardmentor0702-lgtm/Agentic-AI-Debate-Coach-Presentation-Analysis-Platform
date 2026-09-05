"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeSlashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Learner');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const rolesList = ['Learner', 'Debate Coach', 'Educator', 'Administrator'];

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed.");

      if (data.role !== role) {
        throw new Error(`Access denied. Registered role is '${data.role}', not '${role}'.`);
      }

      localStorage.setItem('logos_ai_jwt', data.access_token);
      setMessage({ type: 'success', text: 'Access granted! Welcome to LOGOS.AI.' });
      
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(data);
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          experience_level: "Intermediate",
          preferred_topics: "Technology, AI, Policy"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");

      localStorage.setItem('logos_ai_jwt', data.access_token);
      setMessage({ type: 'success', text: 'Account created successfully! Welcome.' });
      
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(data);
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 9, 11, 0.7)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '2.5rem 2rem',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#6B7280',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.35rem'
            }}
            title="Close modal"
          >
            ✕
          </button>
        )}

        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>
            LOGOS.AI
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.25rem' }}>
            Sign in to access the agentic rhetoric & analytics suite
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#F4F4F5', padding: '5px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E4E4E7' }}>
          <button 
            type="button"
            onClick={() => { setActiveTab('login'); setMessage(null); }}
            style={{
              padding: '0.75rem',
              background: activeTab === 'login' ? '#18181B' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: activeTab === 'login' ? '#FFFFFF' : '#71717A',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'login' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
            }}
          >
            Login
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('signup'); setMessage(null); }}
            style={{
              padding: '0.75rem',
              background: activeTab === 'signup' ? '#18181B' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: activeTab === 'signup' ? '#FFFFFF' : '#71717A',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'signup' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Feedback Alert Message */}
        {message && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, background: message.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: message.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`, textAlign: 'center' }}>
            {message.text}
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 2.8rem 0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Select Role */}
            <div style={{ marginBottom: '1.1rem', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Select Role</label>
              <div
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#111827',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                <span>{role}</span>
                <span style={{ position: 'absolute', right: '1rem', fontSize: '0.7rem', color: '#6B7280', transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>

              {isRoleDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', zIndex: 100, marginTop: '4px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  {rolesList.map((r) => (
                    <div
                      key={r}
                      onClick={() => { setRole(r); setIsRoleDropdownOpen(false); }}
                      style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: role === r ? 'var(--accent-red)' : '#374151', background: role === r ? '#FEF2F2' : '#fff', cursor: 'pointer' }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#6B7280', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: '#18181B', borderRadius: '4px' }} />
                Remember Me
              </label>
            </div>

            {/* Login Button */}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.85rem', background: '#18181B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form onSubmit={handleSignUp}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Full Name</label>
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Confirm</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Select Role */}
            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>Select Role</label>
              <div
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#111827',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                <span>{role}</span>
                <span style={{ position: 'absolute', right: '1rem', fontSize: '0.7rem', color: '#6B7280', transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>

              {isRoleDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', zIndex: 100, marginTop: '4px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  {rolesList.map((r) => (
                    <div
                      key={r}
                      onClick={() => { setRole(r); setIsRoleDropdownOpen(false); }}
                      style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: role === r ? 'var(--accent-red)' : '#374151', background: role === r ? '#FEF2F2' : '#fff', cursor: 'pointer' }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.85rem', background: '#18181B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
