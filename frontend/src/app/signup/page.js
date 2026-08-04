"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [topics, setTopics] = useState('');

  // Custom Dropdown States
  const [role, setRole] = useState('Learner');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const rolesList = ['Learner', 'Debate Coach', 'Educator', 'Administrator'];

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
          preferred_topics: topics || "Technology, AI, Politics"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");

      if (goal || topics) {
        await fetch(`http://localhost:8000/api/v1/auth/profile/me?learning_goals=${encodeURIComponent(goal)}&preferred_topics=${encodeURIComponent(topics)}`, {
          method: "PUT",
          headers: { 
            "Authorization": `Bearer ${data.access_token}`,
            "Content-Type": "application/json"
          }
        });
      }

      localStorage.setItem('logos_ai_jwt', data.access_token);
      setMessage({ type: 'success', text: `Account created successfully! Redirecting...` });
      
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
      setMessage({ type: 'success', text: "Google Sign Up successful! Redirecting..." });
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (e) {
      setMessage({ type: 'error', text: "OAuth2 sign up failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {message && (
        <div style={{ maxWidth: '460px', width: '100%', marginBottom: '1.5rem', padding: '0.85rem 1.2rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 500, background: message.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: message.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`, textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      <div className="auth-card">
        <div className="auth-pill">Create account</div>
        <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.6rem', color: '#111827' }}>
          Join LOGOS.AI
        </h2>
        <p className="auth-subtitle">Start building sharper arguments, stronger delivery, and a clearer coaching path.</p>

        <form onSubmit={handleSignUp}>
          {/* Full Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          {/* Email Address */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Email Address</label>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          {/* Password & Confirm */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Custom Select Role Dropdown Component */}
          <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Select Role</label>
            
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '0.85rem 3rem 0.85rem 1.25rem',
                borderRadius: '12px',
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
                  borderRadius: '12px',
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
                      borderRadius: '8px',
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

          {/* Optional Learning Goals */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Learning Goals (optional)</label>
            <input
              type="text"
              placeholder="Reduce filler words, Master counterarguments"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          {/* Optional Preferred Debate Topics */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Preferred Debate Topics (optional)</label>
            <input
              type="text"
              placeholder="Technology, AI, Politics, Ethics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          {/* Create Account Button */}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: '#18181B', color: '#FFFFFF', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', fontSize: '0.95rem' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Google Sign Up */}
          <button type="button" onClick={handleGoogleOAuth} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifycontent: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
            <GoogleLogo /> Sign Up with Google
          </button>

          {/* Link back to Login */}
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#111827', fontWeight: 600, textDecoration: 'underline' }}>
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
