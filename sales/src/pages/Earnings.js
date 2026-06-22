import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
function inr(n) {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function formatDate(ts) {
    if (!ts)
        return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export default function Earnings() {
    const { data } = useSWR('/api/broker/earnings', async (url) => {
        const res = await brokerFetch(url);
        return res.json();
    });
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Earnings" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "All payouts received from TapLab" })] }), data && (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4", children: [_jsx("p", { className: "text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide", children: "Total Earnings" }), _jsx("p", { className: "text-2xl font-bold text-gray-900 dark:text-white mt-1", children: inr(data.totalEarnings) })] })), _jsx("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: !data ? (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "px-5 py-4 animate-pulse space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-1/3" }), _jsx(Skeleton, { className: "h-3 w-1/4" })] }, i))) })) : data.earnings.length === 0 ? (_jsxs("div", { className: "px-5 py-12 text-center", children: [_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No payouts yet." }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "Payouts appear here once a client subscribes." })] })) : (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: data.earnings.map((e) => (_jsxs("div", { className: "px-5 py-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: e.businessName }), _jsx("p", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: inr((e.commissionAmount ?? 0) + (e.streakBonus ?? 0)) })] }), _jsxs("div", { className: "flex items-center justify-between mt-1", children: [_jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: ["Commission ", inr(e.commissionAmount ?? 0), e.streakBonus ? ` + ${inr(e.streakBonus)} streak bonus` : ''] }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: formatDate(e.commissionPaidAt) })] })] }, e.slug))) })) })] }) }));
}
