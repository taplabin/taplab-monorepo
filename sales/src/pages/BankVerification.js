import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import useSWR from 'swr';
export default function BankVerification({ onVerified }) {
    const toast = useToast();
    const [verifying, setVerifying] = useState(false);
    const { data: profile } = useSWR('/api/broker/me', async (url) => {
        const res = await brokerFetch(url);
        return res.json();
    });
    const handleVerify = async () => {
        setVerifying(true);
        try {
            const res = await brokerFetch('/api/broker/verify-bank', { method: 'POST' });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            toast('Bank details verified');
            onVerified();
        }
        catch (err) {
            toast(err.message || 'Verification failed', 'error');
        }
        finally {
            setVerifying(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Verify your bank details" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-1", children: "Please confirm the details below before accessing the portal. Once verified, payouts will be sent to this account." })] }), profile ? (_jsx("dl", { className: "space-y-3", children: [
                            { label: 'Account Number', value: profile.bankAccountNumber ?? 'Not set' },
                            { label: 'IFSC Code', value: profile.bankIfsc ?? 'Not set' },
                            { label: 'UPI ID', value: profile.upiId ?? 'Not set' },
                        ].map(({ label, value }) => (_jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0", children: [_jsx("dt", { className: "text-sm text-gray-500 dark:text-gray-400", children: label }), _jsx("dd", { className: "text-sm font-medium text-gray-900 dark:text-white font-mono", children: value })] }, label))) })) : (_jsx("div", { className: "space-y-3 animate-pulse", children: [1, 2, 3].map((i) => _jsx("div", { className: "h-8 bg-gray-100 dark:bg-gray-800 rounded" }, i)) })), profile && !profile.bankAccountNumber && (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: "Bank details not set yet. Contact your TapLab admin to add your bank account." })), _jsxs("div", { className: "space-y-3", children: [_jsx("button", { onClick: handleVerify, disabled: verifying || !profile?.bankAccountNumber, className: "w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: verifying ? 'Verifying…' : 'Confirm & Continue' }), _jsx("button", { onClick: () => signOut(auth), className: "w-full py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors", children: "Sign out" })] })] }) }) }));
}
