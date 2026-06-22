import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
function getDisplayStatus(b) {
    if (b.subscriptionStatus === 'active')
        return 'active';
    if (b.subscriptionStatus === 'cancelled')
        return 'cancelled';
    if (b.freeTrialEnabled && b.trialStartDate) {
        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
        if (Date.now() < trialEnd)
            return 'trial';
    }
    return 'inactive';
}
function isTrialExpiringSoon(b) {
    if (!b.freeTrialEnabled || !b.trialStartDate)
        return false;
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
    const daysLeft = (trialEnd - Date.now()) / 86400000;
    return daysLeft <= 7 && daysLeft > 0;
}
function toMRR(b) {
    return b.billingCycle === 'monthly' ? b.pricingAmount : b.pricingAmount / 12;
}
function toNum(s) {
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? 0 : n;
}
function loadCosts() {
    try {
        const saved = localStorage.getItem('taplab-admin-costs');
        if (saved)
            return { railway: '', domain: '', other: '', ...JSON.parse(saved) };
    }
    catch { }
    return { railway: '', domain: '', other: '' };
}
function inr(n) {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function SkeletonCard() {
    return (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-5 animate-pulse", children: [_jsx("div", { className: "h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" }), _jsx("div", { className: "h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" })] }));
}
export default function Overview() {
    const [costs, setCosts] = useState(loadCosts);
    const updateCost = (key, value) => {
        const next = { ...costs, [key]: value };
        setCosts(next);
        localStorage.setItem('taplab-admin-costs', JSON.stringify(next));
    };
    const { data: businesses, isLoading } = useSWR('/api/admin/business', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.businesses;
    });
    if (isLoading || !businesses) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-6 animate-pulse", children: [_jsx("div", { className: "h-7 bg-gray-200 dark:bg-gray-800 rounded w-40" }), _jsx("div", { className: "h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" }), _jsx("div", { className: "h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", children: Array.from({ length: 8 }).map((_, i) => _jsx(SkeletonCard, {}, i)) })] }) }));
    }
    const statuses = businesses.map(getDisplayStatus);
    const counts = {
        active: statuses.filter((s) => s === 'active').length,
        trial: statuses.filter((s) => s === 'trial').length,
        cancelled: statuses.filter((s) => s === 'cancelled').length,
        inactive: statuses.filter((s) => s === 'inactive').length,
        noPage: businesses.filter((b) => b.pageStatus === 'no_page').length,
    };
    // Financial calculations
    const activePayers = businesses.filter((b) => b.subscriptionStatus === 'active');
    const trialBusinesses = businesses.filter((b) => getDisplayStatus(b) === 'trial');
    const atRiskBusinesses = businesses.filter((b) => b.subscriptionStatus === 'inactive' || b.subscriptionStatus === 'cancelled');
    const effectiveMRR = activePayers.reduce((sum, b) => sum + toMRR(b), 0);
    const projectedARR = effectiveMRR * 12;
    const revenueAtRisk = atRiskBusinesses.reduce((sum, b) => sum + toMRR(b), 0);
    const trialPipeline = trialBusinesses.reduce((sum, b) => sum + toMRR(b), 0);
    const totalCosts = toNum(costs.railway) + toNum(costs.domain) + toNum(costs.other);
    const netProfit = effectiveMRR - totalCosts;
    const profitMargin = effectiveMRR > 0 ? Math.round((netProfit / effectiveMRR) * 100) : 0;
    // Existing simple MRR/ARR (raw monthly + raw yearly)
    const rawMRR = businesses
        .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'monthly')
        .reduce((sum, b) => sum + b.pricingAmount, 0);
    const rawARR = businesses
        .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'yearly')
        .reduce((sum, b) => sum + b.pricingAmount, 0);
    const trialsExpiringSoon = businesses.filter(isTrialExpiringSoon);
    const totalSetupFees = businesses.reduce((sum, b) => sum + (b.setupFee ?? 0), 0);
    const commissionOutstanding = businesses
        .filter((b) => b.brokerId && !(b.commissionPaid ?? false) && b.setupFee && b.commissionPercent)
        .reduce((sum, b) => sum + Math.round((b.commissionPercent / 100) * b.setupFee), 0);
    const colorClasses = {
        green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        gray: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    };
    const opStatCards = [
        { label: 'Active', value: counts.active, color: 'green' },
        { label: 'Free Trial', value: counts.trial, color: 'blue' },
        { label: 'Cancelled', value: counts.cancelled, color: 'yellow' },
        { label: 'Inactive', value: counts.inactive, color: 'red' },
        { label: 'Monthly Rev.', value: inr(rawMRR), color: 'indigo' },
        { label: 'Annual Rev.', value: inr(rawARR), color: 'purple' },
        { label: 'Awaiting Page', value: counts.noPage, color: 'gray' },
        { label: 'Setup Fee Rev.', value: inr(totalSetupFees), color: 'teal' },
        { label: 'Commission Due', value: inr(commissionOutstanding), color: commissionOutstanding > 0 ? 'red' : 'gray' },
    ];
    const inputClass = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow';
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Overview" }), _jsxs("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: [businesses.length, " total businesses"] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: [_jsxs("div", { className: "px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Financial Health" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: "Effective MRR normalises yearly subscriptions to monthly equivalent" })] }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 dark:divide-gray-800", children: [_jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Effective MRR" }), _jsx("p", { className: "text-2xl font-bold text-gray-900 dark:text-white tracking-tight", children: inr(effectiveMRR) }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: [activePayers.length, " paying subscriber", activePayers.length !== 1 ? 's' : ''] })] }), _jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Projected ARR" }), _jsx("p", { className: "text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight", children: inr(projectedARR) }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "if current MRR holds" })] }), _jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Revenue at Risk" }), _jsx("p", { className: `text-2xl font-bold tracking-tight ${revenueAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`, children: inr(revenueAtRisk) }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: [atRiskBusinesses.length, " inactive or cancelled"] })] }), _jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Trial Pipeline" }), _jsx("p", { className: `text-2xl font-bold tracking-tight ${trialPipeline > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`, children: inr(trialPipeline) }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: ["potential MRR if ", trialBusinesses.length, " trial", trialBusinesses.length !== 1 ? 's' : '', " convert"] })] })] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-6 mb-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Net Profit" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: "Effective MRR minus your monthly costs \u2014 saved locally" })] }), _jsxs("div", { className: "text-right flex-shrink-0", children: [_jsxs("p", { className: `text-2xl font-bold tracking-tight ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`, children: [netProfit >= 0 ? '+' : '', inr(netProfit), _jsx("span", { className: "text-sm font-normal", children: "/mo" })] }), effectiveMRR > 0 && (_jsxs("p", { className: `text-xs mt-0.5 ${profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`, children: [profitMargin, "% margin"] }))] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
                                { key: 'railway', label: 'Railway (hosting)' },
                                { key: 'domain', label: 'Domain / GoDaddy' },
                                { key: 'other', label: 'Other' },
                            ].map(({ key, label }) => (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-500 dark:text-gray-400 mb-1", children: label }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none", children: "\u20B9" }), _jsx("input", { type: "number", value: costs[key], onChange: (e) => updateCost(key, e.target.value), placeholder: "0", min: "0", className: `${inputClass} pl-6` })] })] }, key))) }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: "Effective MRR" }), _jsx("p", { className: "font-semibold text-gray-900 dark:text-white mt-0.5", children: inr(effectiveMRR) })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: "Total costs/mo" }), _jsx("p", { className: "font-semibold text-gray-900 dark:text-white mt-0.5", children: inr(totalCosts) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: "Net" }), _jsxs("p", { className: `font-semibold mt-0.5 ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`, children: [netProfit >= 0 ? '+' : '', inr(netProfit)] })] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3", children: "Operational" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", children: opStatCards.map((stat) => (_jsxs("div", { className: `rounded-xl border px-4 py-5 ${colorClasses[stat.color]}`, children: [_jsx("p", { className: "text-xs font-medium truncate mb-1 opacity-80", children: stat.label }), _jsx("p", { className: "text-2xl font-bold tracking-tight", children: stat.value })] }, stat.label))) })] }), trialsExpiringSoon.length > 0 && (_jsxs("div", { className: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-3", children: "Trials expiring in 7 days" }), _jsx("div", { className: "space-y-2", children: trialsExpiringSoon.map((b) => {
                                const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
                                const daysLeft = Math.ceil((trialEnd - Date.now()) / 86400000);
                                return (_jsxs("div", { className: "flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 border border-yellow-100 dark:border-yellow-800/50", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: b.businessName }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: ["/", b.businessSlug, " \u00B7 potential ", inr(toMRR(b)), "/mo"] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-sm font-medium text-yellow-700 dark:text-yellow-400", children: [daysLeft, "d left"] }), _jsx(Link, { to: `/business/${b.businessSlug}`, className: "text-xs text-indigo-600 dark:text-indigo-400 hover:underline", children: "View \u2192" })] })] }, b.businessSlug));
                            }) })] })), _jsxs("div", { className: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-3", children: "Quick Actions" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: "/businesses/new", className: "inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors", children: "Add New Business" }), _jsx(Link, { to: "/businesses", className: "inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", children: "View All Businesses" }), _jsx(Link, { to: "/alerts", className: "inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", children: "View Alerts" })] })] })] }) }));
}
