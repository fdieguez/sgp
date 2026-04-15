import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    const [colorblindMode, setColorblindMode] = useState(() => {
        const saved = localStorage.getItem('colorblindMode');
        return saved === 'true';
    });

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('sgp-theme');
        return saved || 'dark';
    });

    useEffect(() => {
        if (colorblindMode) {
            document.documentElement.classList.add('colorblind-mode');
        } else {
            document.documentElement.classList.remove('colorblind-mode');
        }
        localStorage.setItem('colorblindMode', colorblindMode);
    }, [colorblindMode]);

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
        localStorage.setItem('sgp-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ colorblindMode, setColorblindMode, theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
