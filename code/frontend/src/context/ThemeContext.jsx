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

    useEffect(() => {
        if (colorblindMode) {
            document.documentElement.classList.add('colorblind-mode');
        } else {
            document.documentElement.classList.remove('colorblind-mode');
        }
        localStorage.setItem('colorblindMode', colorblindMode);
    }, [colorblindMode]);

    return (
        <ThemeContext.Provider value={{ colorblindMode, setColorblindMode }}>
            {children}
        </ThemeContext.Provider>
    );
}
