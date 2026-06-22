import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
function inr(n) {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function commissionAmount(deal) {
    if (!deal.setupFee || !deal.commissionPercent)
        return 0;
    return Math.round((deal.commissionPercent / 100) * deal.setupFee);
}
export default function BrokerDetail() {
    const { id } = useParams();
    const toast = useToast();
    const [toggling, setToggling] = useState(null);
    const [notes, setNotes] = useState(null); // null = not yet initialised from broker data
    const [savingNotes, setSavingNotes] = useState(false);
    const { data: broker, isLoading, mutate } = useSWR(`/api/admin/brokers/${id}`, async (url) => {
        const res = await adminFetch(url);
        if (!res.ok)
            throw new Error('Broker not found');
        const data = (await res.json());
        // Initialise notes state from fetched data (only on first load)
        setNotes((prev) => prev === null ? (data.notes ?? '') : prev);
        return data;
    });
    const handleSaveNotes = async () => {
        setSavingNotes(true);
        try {
            const res = await adminFetch(`/api/admin/brokers/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ notes }),
            });
            if (!res.ok)
                throw new Error();
            toast('Notes saved');
            mutate((prev) => prev ? { ...prev, notes: notes ?? '' } : prev, false);
        }
        catch {
            toast('Failed to save notes', 'error');
        }
        finally {
            setSavingNotes(false);
        }
    };
    const handleToggle = async (deal) => {
        if (toggling)
            return;
        setToggling(deal.slug);
        // Optimistic update
        mutate((prev) => prev
            ? { ...prev, deals: prev.deals.map((d) => d.slug === deal.slug ? { ...d, commissionPaid: !d.commissionPaid } : d) }
            : prev, false);
        try {
            const res = await adminFetch(`/api/admin/business/${deal.slug}/toggle-commission-paid`, { method: 'POST' });
            if (!res.ok)
                throw new Error();
            toast(deal.commissionPaid ? 'Marked as unpaid' : 'Marked as paid');
        }
        catch {
            // Revert on failure
            mutate((prev) => prev
                ? { ...prev, deals: prev.deals.map((d) => d.slug === deal.slug ? { ...d, commissionPaid: deal.commissionPaid } : d) }
                : prev, false);
            toast('Failed to update — try again', 'error');
        }
        finally {
            setToggling(null);
        }
    };
    if (isLoading || !broker) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5 animate-pulse", children: [_jsx("div", { className: "h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: [1, 2, 3].map((i) => _jsx("div", { className: "h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" }, i)) }), _jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" })] }) }));
    }
    const totalCommission = broker.deals.reduce((sum, d) => sum + commissionAmount(d), 0);
    const paidCommission = broker.deals.filter((d) => d.commissionPaid).reduce((sum, d) => sum + commissionAmount(d), 0);
    const outstanding = totalCommission - paidCommission;
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Link, { to: "/brokers", className: "p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 19l-7-7 7-7" }) }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: broker.name }), _jsxs("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: [broker.phone, broker.email ? ` · ${broker.email}` : ''] })] })] }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: [
                        { label: 'Total deals', value: broker.deals.length.toString() },
                        { label: 'Total commission', value: inr(totalCommission) },
                        { label: 'Outstanding', value: inr(outstanding), highlight: outstanding > 0 },
                    ].map(({ label, value, highlight }) => (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4", children: [_jsx("p", { className: "text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide", children: label }), _jsx("p", { className: `text-xl font-bold mt-1 tracking-tight ${highlight ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`, children: value })] }, label))) }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Bank Details" }), _jsx("span", { className: `text-xs font-medium px-2 py-0.5 rounded-full ${broker.bankVerified
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'}`, children: broker.bankVerified ? 'Verified' : 'Awaiting verification' })] }), _jsx("dl", { className: "space-y-2", children: [
                                { label: 'Account', value: broker.bankAccountNumber ?? '—' },
                                { label: 'IFSC', value: broker.bankIfsc ?? '—' },
                                { label: 'UPI', value: broker.upiId ?? '—' },
                                { label: 'RazorpayX Fund Account', value: broker.razorpayFundAccountId ?? 'Not created yet' },
                            ].map(({ label, value }) => (_jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-xs text-gray-400 dark:text-gray-500", children: label }), _jsx("dd", { className: "text-xs font-medium text-gray-900 dark:text-white font-mono", children: value })] }, label))) })] }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-gray-100 dark:border-gray-800", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Deals" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: "Newest first \u2014 tap to mark commission as paid" })] }), broker.deals.length === 0 ? (_jsx("div", { className: "px-5 py-12 text-center", children: _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No deals yet." }) })) : (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: broker.deals.map((deal) => {
                                const commission = commissionAmount(deal);
                                return (_jsxs("div", { className: "flex items-center gap-4 px-5 py-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(Link, { to: `/business/${deal.slug}`, className: "text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors", children: deal.businessName }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: deal.setupFee
                                                        ? `${inr(deal.setupFee)} setup · ${deal.commissionPercent}% = ${inr(commission)}`
                                                        : 'No setup fee' })] }), _jsxs("button", { onClick: () => handleToggle(deal), disabled: toggling === deal.slug, className: `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${deal.commissionPaid
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600'}`, children: [_jsx("span", { className: `w-2 h-2 rounded-full flex-shrink-0 ${deal.commissionPaid ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}` }), deal.commissionPaid ? 'Paid' : 'Unpaid'] })] }, deal.slug));
                            }) }))] }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-3", children: "Internal Notes" }), _jsx("textarea", { value: notes ?? '', onChange: (e) => setNotes(e.target.value), rows: 4, placeholder: "Payment preferences, relationship notes, anything useful\u2026", className: "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" }), _jsx("button", { onClick: handleSaveNotes, disabled: savingNotes || notes === (broker?.notes ?? ''), className: "mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors", children: savingNotes ? 'Saving…' : 'Save Notes' })] })] }) }));
}
