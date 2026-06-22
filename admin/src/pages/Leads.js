import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
const TABS = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];
const STATUS_COLORS = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
    approved: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
    rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};
export default function Leads() {
    const [tab, setTab] = useState('pending');
    const { data, isLoading } = useSWR(`/api/admin/leads?status=${tab}`, async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.leads;
    });
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-3xl space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Leads" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Client leads and broker referrals submitted by your sales network" })] }), _jsx("div", { className: "flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit", children: TABS.map((t) => (_jsx("button", { onClick: () => setTab(t.value), className: `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.value
                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`, children: t.label }, t.value))) }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: [isLoading && (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "px-5 py-4 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" }), _jsx("div", { className: "h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" })] }, i))) })), !isLoading && (!data || data.length === 0) && (_jsx("div", { className: "px-5 py-12 text-center", children: _jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: ["No ", tab, " leads."] }) })), !isLoading && data && data.length > 0 && (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: data.map((lead) => (_jsxs(Link, { to: `/leads/${lead.id}`, className: "flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: lead.businessName }), _jsx("span", { className: `text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[lead.status]}`, children: lead.status })] }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: ["by ", lead.brokerName, " \u00B7 \u20B9", lead.pricingAmount.toLocaleString('en-IN'), "/", lead.billingCycle === 'monthly' ? 'mo' : 'yr', lead.setupFee > 0 ? ` + ₹${lead.setupFee.toLocaleString('en-IN')} setup` : ''] })] }), _jsx("svg", { className: "w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-3", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 5l7 7-7 7" }) })] }, lead.id))) }))] })] }) }));
}
