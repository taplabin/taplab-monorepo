import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Overview from './pages/Overview';
import BusinessList from './pages/BusinessList';
import AddBusiness from './pages/AddBusiness';
import BusinessDetail from './pages/BusinessDetail';
import Alerts from './pages/Alerts';
import Storage from './pages/Storage';
import Brokers from './pages/Brokers';
import BrokerDetail from './pages/BrokerDetail';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import StreakConfig from './pages/StreakConfig';
function LoadingSpinner() {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950", children: _jsx("div", { className: "w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" }) }));
}
export default function App() {
    const [user, loading] = useAuthState(auth);
    const [isAdmin, setIsAdmin] = useState(null);
    useEffect(() => {
        if (!user) {
            setIsAdmin(null);
            return;
        }
        user.getIdTokenResult().then((result) => {
            if (result.claims.admin) {
                setIsAdmin(true);
            }
            else {
                setIsAdmin(false);
                signOut(auth);
            }
        });
    }, [user]);
    if (loading || (user && isAdmin === null))
        return (_jsx(ThemeProvider, { children: _jsx(LoadingSpinner, {}) }));
    if (!user)
        return (_jsx(ThemeProvider, { children: _jsx(ToastProvider, { children: _jsx(Login, {}) }) }));
    return (_jsx(ThemeProvider, { children: _jsx(ToastProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Overview, {}) }), _jsx(Route, { path: "/businesses", element: _jsx(BusinessList, {}) }), _jsx(Route, { path: "/businesses/new", element: _jsx(AddBusiness, {}) }), _jsx(Route, { path: "/business/:slug", element: _jsx(BusinessDetail, {}) }), _jsx(Route, { path: "/alerts", element: _jsx(Alerts, {}) }), _jsx(Route, { path: "/storage", element: _jsx(Storage, {}) }), _jsx(Route, { path: "/brokers", element: _jsx(Brokers, {}) }), _jsx(Route, { path: "/broker/:id", element: _jsx(BrokerDetail, {}) }), _jsx(Route, { path: "/leads", element: _jsx(Leads, {}) }), _jsx(Route, { path: "/leads/:id", element: _jsx(LeadDetail, {}) }), _jsx(Route, { path: "/streak-config", element: _jsx(StreakConfig, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }));
}
