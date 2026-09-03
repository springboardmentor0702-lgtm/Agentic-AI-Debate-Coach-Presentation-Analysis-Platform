"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('logos_ai_jwt');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    setToken(savedToken);
    apiFetch('/auth/profile/me')
      .then((response) => response.json())
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('logos_ai_jwt');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    setSession: (session) => {
      localStorage.setItem('logos_ai_jwt', session.access_token);
      if (session.user_id) localStorage.setItem('logos_ai_user_id', String(session.user_id));
      setToken(session.access_token);
      setUser({
        id: session.user_id,
        role: session.role,
        full_name: session.full_name,
        email: session.email || '',
      });
    },
    logout: () => {
      localStorage.removeItem('logos_ai_jwt');
      localStorage.removeItem('logos_ai_user_id');
      localStorage.removeItem('logos_ai_session_id');
      setToken(null);
      setUser(null);
    },
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
