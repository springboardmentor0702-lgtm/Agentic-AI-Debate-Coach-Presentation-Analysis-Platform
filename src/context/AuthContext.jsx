import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('mindarena_token'));
    const [isLoading, setIsLoading] = useState(true);
    const initStartedRef = React.useRef(false);
    useEffect(() => {
        if (initStartedRef.current)
            return;
        initStartedRef.current = true;
        async function loadUser() {
            const storedToken = localStorage.getItem('mindarena_token');
            if (storedToken) {
                try {
                    const profile = await api.getMe();
                    if (profile && profile.id) {
                        setUser(profile);
                        setToken(storedToken);
                        setIsLoading(false);
                        return;
                    }
                }
                catch {
                    // Token expired or invalid; clean up quietly
                    localStorage.removeItem('mindarena_token');
                    setToken(null);
                }
            }
            // Smoothly initialize demo learner session
            try {
                const res = await api.login({
                    email: 'learner@mindarena.ai',
                    password: 'password123'
                });
                localStorage.setItem('mindarena_token', res.token);
                setToken(res.token);
                setUser(res.user);
            }
            catch {
                // Fallback gracefully if backend is still initializing
            }
            finally {
                setIsLoading(false);
            }
        }
        loadUser();
    }, []);
    const login = async (email, pass) => {
        setIsLoading(true);
        try {
            const res = await api.login({ email, password: pass });
            localStorage.setItem('mindarena_token', res.token);
            setToken(res.token);
            setUser(res.user);
        }
        finally {
            setIsLoading(false);
        }
    };
    const register = async (data) => {
        setIsLoading(true);
        try {
            const res = await api.register(data);
            localStorage.setItem('mindarena_token', res.token);
            setToken(res.token);
            setUser(res.user);
        }
        finally {
            setIsLoading(false);
        }
    };
    const logout = () => {
        localStorage.removeItem('mindarena_token');
        setToken(null);
        setUser(null);
    };
    // Switch persona between the 4 system roles instantly for evaluation & viva demos
    const switchRolePersona = async (role) => {
        setIsLoading(true);
        try {
            const res = await api.login({
                email: `${role}@mindarena.ai`,
                password: 'password123'
            });
            localStorage.setItem('mindarena_token', res.token);
            setToken(res.token);
            setUser(res.user);
        }
        catch (err) {
            console.error('Failed to switch persona:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            switchRolePersona
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within AuthProvider');
    return context;
};
