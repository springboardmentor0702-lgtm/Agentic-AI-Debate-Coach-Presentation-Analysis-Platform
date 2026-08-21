"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- SVG Icons ---
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

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

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/oauth2/login?provider=Google&email=${encodeURIComponent(email || 'user@gmail.com')}&role=${role}`, {
        method: "POST"
      });
      const data = await res.json();
      localStorage.setItem('logos_ai_jwt', data.access_token);
      setMessage({ type: 'success', text: "Google Authentication successful!" });
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (e) {
      setMessage({ type: 'error', text: "OAuth2 login failed." });
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

          {/* Continue with Google */}
          <button type="button" onClick={handleGoogleOAuth} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
            <GoogleLogo /> Continue with Google
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
