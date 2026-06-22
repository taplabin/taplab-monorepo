import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
// Searchable broker filter combobox — value is 'all' | 'direct' | brokerId
function BrokerFilterCombobox({ brokers, value, onChange, }) {
    const [query, setQuery] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const label = value === 'all' ? 'All brokers' :
        value === 'direct' ? 'Direct (no broker)' :
            brokers.find((b) => b.id === value)?.name ?? 'All brokers';
    const filtered = query.trim()
        ? brokers.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
        : brokers;
    useEffect(() => {
        function onMouseDown(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, []);
    function select(v) {
        onChange(v);
        setQuery('');
        setOpen(false);
    }
    const optionClass = (active) => `w-full text-left px-3 py-2 text-sm transition-colors ${active
        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`;
    return (_jsxs("div", { ref: containerRef, className: "relative", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg cursor-text min-w-44", onClick: () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }, children: [open ? (_jsx("input", { ref: inputRef, type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search broker\u2026", className: "flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none" })) : (_jsx("span", { className: "flex-1 text-sm text-gray-700 dark:text-gray-300 truncate", children: label })), _jsx("svg", { className: "w-4 h-4 text-gray-400 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 9l-7 7-7-7" }) })] }), open && (_jsx("div", { className: "absolute z-30 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden", children: _jsxs("div", { className: "max-h-64 overflow-y-auto", children: [!query && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => select('all'), className: optionClass(value === 'all'), children: "All brokers" }), _jsx("button", { type: "button", onClick: () => select('direct'), className: optionClass(value === 'direct'), children: "Direct (no broker)" }), brokers.length > 0 && _jsx("div", { className: "border-t border-gray-100 dark:border-gray-800" })] })), filtered.length === 0 ? (_jsx("div", { className: "px-3 py-2 text-sm text-gray-400 dark:text-gray-500", children: "No brokers match" })) : (filtered.map((b) => (_jsx("button", { type: "button", onClick: () => select(b.id), className: optionClass(value === b.id), children: b.name }, b.id))))] }) }))] }));
}
function getDisplayStatus(b) {
    if (b.subscriptionStatus === 'active')
        return 'active';
    if (b.subscriptionStatus === 'cancelled')
        return 'cancelled';
    if (b.freeTrialEnabled && b.trialStartDate) {
        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 24 * 60 * 60 * 1000;
        if (Date.now() < trialEnd)
            return 'trial';
    }
    return 'inactive';
}
const TABS = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Free Trial', value: 'trial' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Inactive', value: 'inactive' },
];
const ROW_BG = {
    active: '',
    trial: 'bg-blue-50 dark:bg-blue-900/10',
    cancelled: 'bg-yellow-50 dark:bg-yellow-900/10',
    inactive: 'bg-red-50 dark:bg-red-900/10',
};
export default function BusinessList() {
    const [activeTab, setActiveTab] = React.useState('all');
    const [search, setSearch] = React.useState('');
    const [brokerFilter, setBrokerFilter] = React.useState('all'); // 'all' | 'direct' | brokerId
    const { data, error, isLoading } = useSWR('/api/admin/business', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.businesses;
    });
    const enriched = React.useMemo(() => (data ?? []).map((b) => ({ ...b, displayStatus: getDisplayStatus(b) })), [data]);
    const brokerOptions = React.useMemo(() => {
        const seen = new Map();
        enriched.forEach((b) => { if (b.brokerId && b.brokerName)
            seen.set(b.brokerId, b.brokerName); });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [enriched]);
    const filtered = React.useMemo(() => {
        let list = activeTab === 'all' ? enriched : enriched.filter((b) => b.displayStatus === activeTab);
        if (brokerFilter === 'direct')
            list = list.filter((b) => !b.brokerId);
        else if (brokerFilter !== 'all')
            list = list.filter((b) => b.brokerId === brokerFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((b) => b.businessName.toLowerCase().includes(q) || b.businessSlug.toLowerCase().includes(q));
        }
        return list;
    }, [enriched, activeTab, brokerFilter, search]);
    const counts = React.useMemo(() => {
        const base = { all: enriched.length, active: 0, trial: 0, cancelled: 0, inactive: 0 };
        enriched.forEach((b) => { base[b.displayStatus]++; });
        return base;
    }, [enriched]);
    if (isLoading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-7 bg-gray-200 dark:bg-gray-800 rounded w-40" }), Array.from({ length: 5 }).map((_, i) => (_jsx("div", { className: "h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" }, i)))] }) }));
    }
    if (error) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "text-center py-12 text-red-600 dark:text-red-400", children: ["Error loading businesses: ", error.message] }) }));
    }
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Businesses" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "All businesses with their subscription and deployment status." })] }), _jsx(Link, { to: "/businesses/new", className: "flex-shrink-0 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors", children: "Add business" })] }), _jsxs("div", { className: "flex gap-3 flex-wrap", children: [_jsxs("div", { className: "relative flex-1 min-w-48", children: [_jsx("svg", { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by name or slug\u2026", className: "w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" })] }), brokerOptions.length > 0 && (_jsx(BrokerFilterCombobox, { brokers: brokerOptions, value: brokerFilter, onChange: setBrokerFilter }))] }), _jsx("div", { className: "border-b border-gray-200 dark:border-gray-800", children: _jsx("nav", { className: "-mb-px flex gap-1 overflow-x-auto", children: TABS.map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.value), className: `whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === tab.value
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`, children: [tab.label, _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${activeTab === tab.value
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`, children: counts[tab.value] })] }, tab.value))) }) }), _jsx("div", { className: "-mx-4 sm:-mx-6 lg:-mx-8 overflow-x-auto", children: _jsx("div", { className: "inline-block min-w-full align-middle px-4 sm:px-6 lg:px-8", children: _jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-800", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-800/60", children: _jsxs("tr", { children: [_jsx("th", { className: "py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Business" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Slug" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Subscription" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Page" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Billing" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Broker" }), _jsx("th", { className: "relative py-3 pl-3 pr-4", children: _jsx("span", { className: "sr-only", children: "Actions" }) })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900", children: filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "py-12 text-center text-sm text-gray-400 dark:text-gray-500", children: "No businesses in this category." }) })) : (filtered.map((business) => (_jsxs("tr", { className: ROW_BG[business.displayStatus], children: [_jsx("td", { className: "whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white", children: business.businessName }), _jsx("td", { className: "whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono", children: business.businessSlug }), _jsx("td", { className: "whitespace-nowrap px-3 py-4 text-sm", children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(StatusBadge, { status: business.displayStatus }), business.displayStatus === 'trial' && business.trialStartDate && (_jsxs("span", { className: "text-xs text-gray-400 dark:text-gray-500", children: ["Ends ", new Date(business.trialStartDate.seconds * 1000 + business.trialDurationDays * 86400000).toLocaleDateString('en-IN')] })), business.displayStatus === 'cancelled' && business.subscriptionEndsAt && (_jsxs("span", { className: "text-xs text-gray-400 dark:text-gray-500", children: ["Live until ", new Date(business.subscriptionEndsAt.seconds * 1000).toLocaleDateString('en-IN')] }))] }) }), _jsx("td", { className: "whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400", children: business.pageStatus === 'deployed'
                                                        ? `Deployed (${business.pageVersion?.slice(0, 8)})`
                                                        : 'Awaiting deployment' }), _jsxs("td", { className: "whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400", children: ["\u20B9", business.pricingAmount, "/", business.billingCycle === 'monthly' ? 'mo' : 'yr'] }), _jsx("td", { className: "whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400", children: business.brokerName ?? _jsx("span", { className: "text-gray-300 dark:text-gray-600", children: "\u2014" }) }), _jsx("td", { className: "relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium", children: _jsx(Link, { to: `/business/${business.businessSlug}`, className: "text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300", children: "View" }) })] }, business.businessSlug)))) })] }) }) }) })] }) }));
}
