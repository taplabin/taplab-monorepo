import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
const NAV = [
    {
        to: '/dashboard',
        label: 'Dashboard',
        icon: (_active) => (_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" }) })),
    },
    {
        to: '/submissions',
        label: 'Submissions',
        icon: (_active) => (_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }) })),
    },
    {
        to: '/leaderboard',
        label: 'Leaderboard',
        icon: (_active) => (_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) })),
    },
    {
        to: '/earnings',
        label: 'Earnings',
        icon: (_active) => (_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) })),
    },
];
const activeClass = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200';
export default function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    function SidebarContent() {
        return (_jsxs("div", { className: "flex flex-col flex-1 overflow-y-auto", children: [_jsxs("div", { className: "px-5 pt-3.5 pb-5 border-b border-gray-100 dark:border-gray-800", children: [_jsx("img", { src: theme === 'dark' ? '/taplabdark.png' : '/taplab.png', alt: "TapLab", className: "h-10 w-auto" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: "Sales Portal" })] }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-0.5", children: NAV.map((item) => (_jsx(NavLink, { to: item.to, onClick: () => setMobileOpen(false), className: ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? activeClass : inactiveClass}`, children: ({ isActive }) => _jsxs(_Fragment, { children: [item.icon(isActive), _jsx("span", { children: item.label })] }) }, item.to))) }), _jsxs("div", { className: "px-3 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5", children: [_jsxs("button", { onClick: toggleTheme, className: `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${inactiveClass}`, children: [_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: theme === 'light'
                                        ? _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" })
                                        : _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" }) }), theme === 'light' ? 'Dark mode' : 'Light mode'] }), _jsxs("button", { onClick: () => signOut(auth), className: `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${inactiveClass}`, children: [_jsx("svg", { className: "w-5 h-5 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }) }), "Sign out"] })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-950 flex", children: [_jsx("aside", { className: "hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800", children: _jsx(SidebarContent, {}) }), _jsxs("div", { className: "md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800", children: [_jsx("button", { onClick: () => setMobileOpen(true), className: "p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6h16M4 12h16M4 18h16" }) }) }), _jsx("img", { src: theme === 'dark' ? '/taplabdark.png' : '/taplab.png', alt: "TapLab", className: "h-8 w-auto" })] }), mobileOpen && (_jsxs("div", { className: "md:hidden fixed inset-0 z-50 flex", children: [_jsx("div", { className: "fixed inset-0 bg-black/40 backdrop-blur-sm", onClick: () => setMobileOpen(false) }), _jsxs("aside", { className: "relative flex flex-col w-64 bg-white dark:bg-gray-900 h-full shadow-2xl", children: [_jsx("button", { onClick: () => setMobileOpen(false), className: "absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }) }), _jsx(SidebarContent, {})] })] })), _jsx("div", { className: "flex-1 md:ml-56 pt-14 md:pt-0 min-w-0", children: _jsx("main", { className: "px-4 sm:px-6 lg:px-8 py-6", children: children }) })] }));
}
