import React, { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('mindarena_theme');
        return saved || 'dark'; // Futuristic, professional dark by default
    });
    useEffect(() => {
        localStorage.setItem('mindarena_theme', theme);
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
            root.style.colorScheme = 'dark';
        }
        else {
            root.classList.remove('dark');
            root.classList.add('light');
            root.style.colorScheme = 'light';
        }
    }, [theme]);
    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };
    return (<ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>);
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context)
        throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
