import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
export default function Login() {
    const [view, setView] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const { theme } = useTheme();
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        }
        catch {
            setError('Invalid email or password.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleForgot = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
        }
        catch {
            setError('Could not send reset email. Check the address and try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("img", { src: theme === 'dark' ? '/taplabdark.png' : '/taplab.png', alt: "TapLab", className: "h-12 w-auto mx-auto" }), _jsx("p", { className: "text-gray-500 dark:text-gray-400 text-sm mt-1", children: view === 'login' ? 'Sign in to Sales Portal' : 'Reset your password' })] }), _jsx("div", { className: "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4", children: view === 'login' ? (_jsxs("form", { onSubmit: handleLogin, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoComplete: "email", className: "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#13204d] transition-shadow" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Password" }), _jsx("button", { type: "button", onClick: () => { setView('forgot'); setError(''); }, className: "text-xs text-[#13204d] dark:text-[#a8b4d4] hover:text-[#0e1836] dark:hover:text-[#c5cde6]", children: "Forgot password?" })] }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, autoComplete: "current-password", className: "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#13204d] transition-shadow" })] }), error && _jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-[#2087e6] hover:bg-[#13204d] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: loading ? 'Signing in…' : 'Sign in' })] })) : resetSent ? (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm font-medium text-green-600 dark:text-green-400", children: "Reset link sent!" }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: ["Check your inbox at ", _jsx("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: email }), ". If you don't see it, check your spam folder."] }), _jsx("button", { onClick: () => { setView('login'); setResetSent(false); }, className: "text-sm text-[#13204d] dark:text-[#a8b4d4] hover:text-[#0e1836]", children: "Back to sign in" })] })) : (_jsxs("form", { onSubmit: handleForgot, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoComplete: "email", className: "w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#13204d] transition-shadow" })] }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: "The reset link may arrive in your spam folder \u2014 check there if you don't see it." }), error && _jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-[#2087e6] hover:bg-[#13204d] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: loading ? 'Sending…' : 'Send Reset Link' }), _jsx("button", { type: "button", onClick: () => { setView('login'); setError(''); }, className: "w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300", children: "Back to sign in" })] })) })] }) }));
}
