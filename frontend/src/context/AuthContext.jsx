import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("debate_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("debate_token");
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me);
          localStorage.setItem("debate_user", JSON.stringify(me));
        } catch (err) {
          console.warn("Token expired or invalid:", err);
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem("debate_token", res.access_token);
    localStorage.setItem("debate_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (fullName, email, password, role) => {
    const res = await api.register(fullName, email, password, role);
    localStorage.setItem("debate_token", res.access_token);
    localStorage.setItem("debate_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const demoLogin = async (role) => {
    const res = await api.demoLogin(role);
    localStorage.setItem("debate_token", res.access_token);
    localStorage.setItem("debate_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("debate_token");
    localStorage.removeItem("debate_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
