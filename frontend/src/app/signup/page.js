"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, storeAuth } from '../../lib/api';

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [topics, setTopics] = useState('');

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
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          experience_level: 'Intermediate',
          preferred_topics: topics || 'Technology, AI, Politics',
        }),
      });

      if (goal || topics) {
        await apiFetch('/auth/profile/me', {
          method: 'PUT',
          body: JSON.stringify({ learning_goals: goal, preferred_topics: topics }),
        });
      }

      storeAuth(data);
      setMessage({ type: 'success', text: `Account created successfully! Redirecting...` });
      
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
    <div style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', position: 'relative' }}>
      
      {/* Aurora Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {message && (
        <div style={{ maxWidth: '480px', width: '100%', marginBottom: '1.5rem', padding: '0.9rem 1.25rem', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 600, background: message.type === 'error' ? 'rgba(254, 242, 242, 0.9)' : 'rgba(236, 253, 245, 0.9)', backdropFilter: 'blur(12px)', color: message.type === 'error' ? '#dc2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#6ee7b7'}`, textAlign: 'center', zIndex: 1 }}>
          {message.text}
        </div>
      )}

      {/* iOS Glass Signup Card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', position: 'relative', zIndex: 1 }}>
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
            <span className="badge-dot"></span> NEW DEBATER REGISTRATION
          </div>
          <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Create Your <span className="text-gradient">Account</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Join the agentic debate and presentation platform.
          </p>
        </div>

        <form onSubmit={handleSignUp}>
          {/* Full Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Email Address */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
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

          {/* Role Dropdown */}
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
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

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Confirm
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Preferred Topics */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Preferred Debate Domains (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Technology, Ethics, Economics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-red"
            style={{ width: '100%', padding: '0.9rem', fontSize: '0.92rem' }}
          >
            {loading ? 'CREATING ACCOUNT…' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--ios-indigo)', fontWeight: 700 }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
