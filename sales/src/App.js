import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import BankVerification from './pages/BankVerification';
import Dashboard from './pages/Dashboard';
import Submissions from './pages/Submissions';
import Leaderboard from './pages/Leaderboard';
import Earnings from './pages/Earnings';
function Spinner() {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950", children: _jsx("div", { className: "w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" }) }));
}
export default function App() {
    const [user, loading] = useAuthState(auth);
    const [isBroker, setIsBroker] = useState(null);
    const [bankVerified, setBankVerified] = useState(null);
    useEffect(() => {
        if (!user) {
            setIsBroker(null);
            setBankVerified(null);
            return;
        }
        user.getIdTokenResult().then(async (result) => {
            if (!result.claims.broker) {
                setIsBroker(false);
                signOut(auth);
                return;
            }
            setIsBroker(true);
            // Check bank verification status
            try {
                const token = await user.getIdToken();
                const res = await fetch('/api/broker/me', { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                setBankVerified(data.bankVerified ?? false);
            }
            catch {
                setBankVerified(false);
            }
        });
    }, [user]);
    if (loading || (user && isBroker === null)) {
        return _jsx(ThemeProvider, { children: _jsx(Spinner, {}) });
    }
    if (!user) {
        return _jsx(ThemeProvider, { children: _jsx(ToastProvider, { children: _jsx(Login, {}) }) });
    }
    if (user && isBroker && bankVerified === false) {
        return (_jsx(ThemeProvider, { children: _jsx(ToastProvider, { children: _jsx(BankVerification, { onVerified: () => setBankVerified(true) }) }) }));
    }
    return (_jsx(ThemeProvider, { children: _jsx(ToastProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/submissions", element: _jsx(Submissions, {}) }), _jsx(Route, { path: "/leaderboard", element: _jsx(Leaderboard, {}) }), _jsx(Route, { path: "/earnings", element: _jsx(Earnings, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }) }));
}
