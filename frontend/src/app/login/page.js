"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, storeAuth } from '../../lib/api';

// --- SVG Icons ---
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

  // Custom Dropdown States
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
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', fontFamily: "'Inter', sans-serif" }}>
      
      {message && (
        <div style={{ maxWidth: '440px', width: '100%', marginBottom: '1.5rem', padding: '0.85rem 1.2rem', borderRadius: 0, fontSize: '0.875rem', fontWeight: 500, background: message.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: message.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`, textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', borderRadius: 0, padding: '2.5rem 2rem', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07)', border: '1px solid #E5E7EB', position: 'relative' }}>
        <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', textAlign: 'center', color: '#111827' }}>
          Login
        </h2>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Email address</label>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Password</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 2.8rem 0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Select Role Custom Dropdown with Spacious ▼ Arrow */}
          <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Select Role</label>
            
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '0.85rem 3rem 0.85rem 1.25rem',
                borderRadius: 0,
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                fontSize: '0.9rem',
                color: '#111827',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
                userSelect: 'none',
                position: 'relative'
              }}
            >
              <span>{role}</span>
              
              {/* Down Arrow with spacious padding on the right */}
              <span 
                style={{ 
                  position: 'absolute',
                  right: '1.5rem',
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  transition: 'transform 0.2s', 
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                }}
              >
                ▼
              </span>
            </div>

            {isDropdownOpen && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 0,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  marginTop: '0.5rem',
                  zIndex: 100,
                  padding: '4px',
                  boxSizing: 'border-box'
                }}
              >
                {rolesList.map((r) => (
                  <div
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: 0,
                      fontSize: '0.9rem',
                      color: role === r ? 'var(--accent-red)' : '#374151',
                      background: role === r ? '#FEF2F2' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: role === r ? 600 : 400
                    }}
                    onMouseEnter={(e) => {
                      if (role !== r) {
                        e.target.style.background = '#F3F4F6';
                        e.target.style.color = '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (role !== r) {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#374151';
                      }
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: '#18181B' }}
            />
            <label htmlFor="remember" style={{ fontSize: '0.85rem', color: '#6B7280', userSelect: 'none', cursor: 'pointer' }}>Remember Me</label>
          </div>

          {/* Login Button */}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem', borderRadius: 0, background: '#18181B', color: '#FFFFFF', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', fontSize: '0.95rem' }}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>

          {/* Sign Up Redirect */}
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>
            Don't have an account yet?{' '}
            <Link href="/signup" style={{ color: '#111827', fontWeight: 600, textDecoration: 'underline' }}>
              Sign Up
            </Link>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
            <a href="#forgot" style={{ color: '#6B7280', fontWeight: 600, textDecoration: 'underline' }}>
              Forgot Password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
