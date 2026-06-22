import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
function daysUntil(ms) {
    return (ms - Date.now()) / 86400000;
}
function fmt(seconds) {
    return new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function AlertRow({ slug, name, detail, link }) {
    return (_jsxs("div", { className: "flex items-center justify-between py-3 px-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: name }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: detail })] }), _jsx(Link, { to: `/business/${slug}`, className: "text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex-shrink-0 ml-4", children: link ?? 'View →' })] }));
}
function Section({ title, color, children }) {
    return (_jsxs("div", { className: `rounded-xl border p-5 space-y-2 ${color}`, children: [_jsx("h2", { className: "text-sm font-semibold mb-3", children: title }), children] }));
}
export default function Alerts() {
    const { data: businesses, isLoading } = useSWR('/api/admin/business', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.businesses;
    });
    if (isLoading || !businesses) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-7 bg-gray-200 dark:bg-gray-800 rounded w-32" }), Array.from({ length: 3 }).map((_, i) => (_jsx("div", { className: "h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" }, i)))] }) }));
    }
    const trialsExpiringSoon = businesses.filter((b) => {
        if (!b.freeTrialEnabled || !b.trialStartDate)
            return false;
        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
        const d = daysUntil(trialEnd);
        return d > 0 && d <= 7;
    });
    const cancelledExpiringSoon = businesses.filter((b) => {
        if (b.subscriptionStatus !== 'cancelled' || !b.subscriptionEndsAt)
            return false;
        const d = daysUntil(b.subscriptionEndsAt.seconds * 1000);
        return d > 0 && d <= 7;
    });
    const inactive = businesses.filter((b) => {
        if (b.subscriptionStatus === 'active' || b.subscriptionStatus === 'cancelled')
            return false;
        if (b.freeTrialEnabled && b.trialStartDate) {
            const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
            if (Date.now() < trialEnd)
                return false;
        }
        return true;
    });
    const noPage = businesses.filter((b) => {
        if (b.pageStatus !== 'no_page')
            return false;
        const daysSinceCreated = (Date.now() - b.createdAt.seconds * 1000) / 86400000;
        return daysSinceCreated >= 14;
    });
    const totalAlerts = trialsExpiringSoon.length + cancelledExpiringSoon.length + inactive.length + noPage.length;
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Alerts" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: totalAlerts === 0 ? 'No alerts right now.' : `${totalAlerts} item${totalAlerts !== 1 ? 's' : ''} need attention.` })] }), totalAlerts === 0 && (_jsxs("div", { className: "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center", children: [_jsx("p", { className: "text-3xl mb-3", children: "\u2705" }), _jsx("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "All clear" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "No businesses need attention right now." })] })), trialsExpiringSoon.length > 0 && (_jsx(Section, { title: `⏳ Trials expiring soon (${trialsExpiringSoon.length})`, color: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300", children: trialsExpiringSoon.map((b) => {
                        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
                        const d = Math.ceil(daysUntil(trialEnd));
                        return (_jsx(AlertRow, { slug: b.businessSlug, name: b.businessName, detail: `Trial ends in ${d} day${d !== 1 ? 's' : ''} — ${fmt(b.trialStartDate.seconds + b.trialDurationDays * 86400)}` }, b.businessSlug));
                    }) })), cancelledExpiringSoon.length > 0 && (_jsx(Section, { title: `📴 Cancelled — page going offline soon (${cancelledExpiringSoon.length})`, color: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300", children: cancelledExpiringSoon.map((b) => {
                        const d = Math.ceil(daysUntil(b.subscriptionEndsAt.seconds * 1000));
                        return (_jsx(AlertRow, { slug: b.businessSlug, name: b.businessName, detail: `Page goes offline in ${d} day${d !== 1 ? 's' : ''} — ${fmt(b.subscriptionEndsAt.seconds)}` }, b.businessSlug));
                    }) })), inactive.length > 0 && (_jsx(Section, { title: `💳 Inactive — payment needed (${inactive.length})`, color: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300", children: inactive.map((b) => (_jsx(AlertRow, { slug: b.businessSlug, name: b.businessName, detail: "Page is offline \u2014 subscription not active" }, b.businessSlug))) })), noPage.length > 0 && (_jsx(Section, { title: `🏗️ No page deployed — 14+ days old (${noPage.length})`, color: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300", children: noPage.map((b) => {
                        const days = Math.floor((Date.now() - b.createdAt.seconds * 1000) / 86400000);
                        return (_jsx(AlertRow, { slug: b.businessSlug, name: b.businessName, detail: `Created ${days} days ago — no page deployed yet` }, b.businessSlug));
                    }) }))] }) }));
}
