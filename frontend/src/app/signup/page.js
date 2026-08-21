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
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '90vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', fontFamily: "'Inter', sans-serif" }}>
      
      {message && (
        <div style={{ maxWidth: '460px', width: '100%', marginBottom: '1.5rem', padding: '0.85rem 1.2rem', borderRadius: 0, fontSize: '0.875rem', fontWeight: 500, background: message.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: message.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`, textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '460px', background: '#FFFFFF', borderRadius: 0, padding: '2.5rem 2rem', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07)', border: '1px solid #E5E7EB', position: 'relative' }}>
        <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', textAlign: 'center', color: '#111827' }}>
          Sign Up
        </h2>

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
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
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
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
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
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
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
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
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

          {/* Optional Learning Goals */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>Learning Goals (optional)</label>
            <input
              type="text"
              placeholder="Reduce filler words, Master counterarguments"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
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
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
            />
          </div>

          {/* Create Account Button */}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem', borderRadius: 0, background: '#18181B', color: '#FFFFFF', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', fontSize: '0.95rem' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
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
