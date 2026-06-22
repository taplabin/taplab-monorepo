import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => { } });
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('taplab-theme') ?? 'light');
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('taplab-theme', theme);
    }, [theme]);
    return (_jsx(ThemeContext.Provider, { value: { theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }, children: children }));
}
