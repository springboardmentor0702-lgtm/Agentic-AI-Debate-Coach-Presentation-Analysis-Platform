"use client";

import { useState, useEffect } from 'react';

// --- Official Brand SVG Logos ---
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.69-1.97-14.63-6.35-3.3-2.88-7.16-7.53-11.58-13.96-6.66-9.67-11.83-20.24-15.5-31.71-3.67-11.47-5.5-22.69-5.5-33.67 0-14.28 3.51-26.04 10.53-35.27 7.02-9.23 15.79-13.97 26.32-14.22 4.96 0 10.15 1.21 15.57 3.63 5.42 2.42 9.07 3.68 10.95 3.78 1.65 0 5.4-1.31 11.25-3.93 5.85-2.62 10.93-3.83 15.25-3.63 11.8.63 21.05 4.98 27.75 13.06-10.42 6.31-15.5 15.11-15.25 26.4.25 9.04 3.73 16.59 10.44 22.65 6.71 6.06 14.65 9.54 23.82 10.44-2.5 7.4-5.85 14.72-10.05 21.95zm-30.82-103.5c0-6.84 2.44-13.44 7.32-19.8 4.88-6.36 11.08-10.39 18.6-12.09.25 1.01.38 1.9.38 2.68 0 7.02-2.58 13.78-7.75 20.28-5.17 6.5-11.41 10.48-18.72 11.94-.13-1.01-.19-1.9-.19-3.01z" />
  </svg>
);

const BinanceLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#F0B90B">
    <path d="M12 0l3.87 3.87-3.87 3.87L8.13 3.87 12 0zm-7.74 7.74l3.87-3.87 3.87 3.87-3.87 3.87-3.87-3.87zM12 7.74l3.87 3.87-3.87 3.87-3.87-3.87L12 7.74zm7.74 0l3.87 3.87-3.87 3.87-3.87-3.87 3.87-3.87zM4.26 15.48l3.87-3.87 3.87 3.87-3.87 3.87-3.87-3.87zm15.48 0l-3.87-3.87 3.87-3.87 3.87 3.87-3.87 3.87zM12 15.48l3.87 3.87L12 23.22l-3.87-3.87L12 15.48z" />
  </svg>
);

const WalletLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
  </svg>
);

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = Sign Up

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Learner'); // Learner, Debate Coach, Educator, Administrator
  const [keepUpdated, setKeepUpdated] = useState(false);

  // OAuth Modal State
  const [oauthModal, setOauthModal] = useState(null); // 'Google', 'Apple', 'Binance', 'Wallet'
  const [oauthInput, setOauthInput] = useState('');

  // Auth User Session State
  const [userToken, setUserToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('logos_ai_jwt');
    if (savedToken) {
      setUserToken(savedToken);
      fetchProfile(savedToken);
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/profile/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.log("Profile fetch error:", err);
    }
  };

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
      if (!res.ok) throw new Error(data.detail || "Login failed");

      localStorage.setItem('logos_ai_jwt', data.access_token);
      setUserToken(data.access_token);
      setMessage({ type: 'success', text: `Welcome back ${data.full_name}! (${data.role})` });
      fetchProfile(data.access_token);
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

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: email.split('@')[0],
          role: role
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      localStorage.setItem('logos_ai_jwt', data.access_token);
      setUserToken(data.access_token);
      setMessage({ type: 'success', text: `Account created successfully! Logged in as ${data.role}.` });
      fetchProfile(data.access_token);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const openOAuthModal = (provider) => {
    setOauthModal(provider);
    if (provider === 'Google') setOauthInput('user@gmail.com');
    else if (provider === 'Apple') setOauthInput('user@icloud.com');
    else if (provider === 'Binance') setOauthInput('binance_user_9921');
    else if (provider === 'Wallet') setOauthInput('0x71C765...3921F');
  };

  const submitOAuthModal = async () => {
    if (!oauthInput) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/oauth2/login?provider=${oauthModal}&email=${encodeURIComponent(oauthInput)}&role=${role}`, {
        method: "POST"
      });
      const data = await res.json();
      localStorage.setItem('logos_ai_jwt', data.access_token);
      setUserToken(data.access_token);
      setMessage({ type: 'success', text: `Authenticated via ${oauthModal} OAuth2 as ${data.full_name} (${data.role})!` });
      fetchProfile(data.access_token);
      setOauthModal(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'OAuth2 authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    setUserToken(null);
    setUserProfile(null);
    setMessage({ type: 'success', text: 'Logged out successfully.' });
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        backgroundImage: 'radial-gradient(#E5E7EB 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#111827'
      }}
    >
      
      {/* Alert Notification Message */}
      {message && (
        <div 
          style={{
            maxWidth: '440px',
            width: '100%',
            marginBottom: '1.5rem',
            padding: '0.85rem 1.2rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: message.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: message.type === 'error' ? '#DC2626' : '#059669',
            border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          {message.text}
        </div>
      )}

      {/* Main Auth Card Container */}
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '2.25rem 2rem',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          position: 'relative'
        }}
      >
        
        {/* Top Segmented Tab Pill: [ Login ]  [ Sign Up ] */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div 
            style={{
              display: 'inline-flex',
              background: '#F3F4F6',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid #E5E7EB'
            }}
          >
            {/* Login Tab Button */}
            <button
              onClick={() => setIsLogin(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isLogin ? '#FFFFFF' : 'transparent',
                color: isLogin ? '#111827' : '#6B7280',
                boxShadow: isLogin ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Login
            </button>

            {/* Sign Up Tab Button */}
            <button
              onClick={() => setIsLogin(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: !isLogin ? '#FFFFFF' : 'transparent',
                color: !isLogin ? '#111827' : '#6B7280',
                boxShadow: !isLogin ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Sign Up
            </button>
          </div>
        </div>

        {/* -------------------- VIEW 1: LOGIN -------------------- */}
        {isLogin ? (
          <form onSubmit={handleLogin}>
            {/* Email Address Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.9rem',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Password
                </label>
                <a href="#forgot" style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.8rem 0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                
                {/* Eye Icon Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '12px',
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                marginBottom: '1.5rem'
              }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            {/* OR Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
              <span style={{ padding: '0 0.75rem', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
            </div>

            {/* OAuth Social Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <button
                type="button"
                onClick={() => openOAuthModal('Google')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <GoogleLogo /> Continue with Google
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Apple')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <AppleLogo /> Continue with Apple
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Binance')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <BinanceLogo /> Continue with Binance
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Wallet')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <WalletLogo /> Continue with Wallet
              </button>
            </div>

            {/* Footer Prompt */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
              Don't have an account yet?{' '}
              <button 
                type="button" 
                onClick={() => setIsLogin(false)}
                style={{ background: 'none', border: 'none', color: '#111827', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Sign up
              </button>
            </div>
          </form>
        ) : (
          /* -------------------- VIEW 2: SIGN UP -------------------- */
          <form onSubmit={handleSignUp}>
            
            {/* Social Options at Top for Sign Up */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => openOAuthModal('Google')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <GoogleLogo /> Continue with Google
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Apple')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <AppleLogo /> Continue with Apple
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Binance')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <BinanceLogo /> Continue with Binance
              </button>

              <button
                type="button"
                onClick={() => openOAuthModal('Wallet')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer'
                }}
              >
                <WalletLogo /> Continue with Wallet
              </button>
            </div>

            {/* OR Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
              <span style={{ padding: '0 0.75rem', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.9rem',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.8rem 0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            {/* Platform Role Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
                Platform Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.9rem',
                  color: '#111827',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Learner">Learner (Debater / Speaker)</option>
                <option value="Debate Coach">Debate Coach (Mentor)</option>
                <option value="Educator">Educator (Class Manager)</option>
                <option value="Administrator">Administrator (Platform Admin)</option>
              </select>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '12px',
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1.25rem'
              }}
            >
              {loading ? 'Creating account...' : 'Create an account'}
            </button>

            {/* Checkbox Notice */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <input
                type="checkbox"
                id="newsletter"
                checked={keepUpdated}
                onChange={(e) => setKeepUpdated(e.target.checked)}
                style={{ marginTop: '0.2rem', borderRadius: '4px', accentColor: '#18181B' }}
              />
              <label htmlFor="newsletter" style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.4 }}>
                Please keep me updated by email with the latest news, research findings, reward programs, event updates.
              </label>
            </div>

            {/* Footer Prompt */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsLogin(true)}
                style={{ background: 'none', border: 'none', color: '#111827', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Interactive OAuth2 Authentication Modal Popup */}
      {oauthModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              {oauthModal === 'Google' && <GoogleLogo />}
              {oauthModal === 'Apple' && <AppleLogo />}
              {oauthModal === 'Binance' && <BinanceLogo />}
              {oauthModal === 'Wallet' && <WalletLogo />}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {oauthModal} Single Sign-On
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.25rem' }}>
              Enter your {oauthModal} Account identifier / address to complete OAuth2 authentication:
            </p>

            <input
              type="text"
              value={oauthInput}
              onChange={(e) => setOauthInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setOauthModal(null)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>

              <button
                onClick={submitOAuthModal}
                disabled={loading}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#18181B', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                {loading ? 'Authorizing...' : 'Authorize & Log In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Session Bar if logged in */}
      {userProfile && (
        <div style={{ marginTop: '2rem', maxWidth: '440px', width: '100%', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{userProfile.full_name}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Role: <span style={{ fontWeight: 600, color: '#D90429' }}>{userProfile.role}</span></div>
          </div>
          <button onClick={handleLogout} style={{ background: '#F3F4F6', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
