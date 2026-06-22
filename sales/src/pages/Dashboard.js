import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
function inr(n) {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
export default function Dashboard() {
    const navigate = useNavigate();
    const { data, isLoading } = useSWR('/api/broker/dashboard', async (url) => {
        const res = await brokerFetch(url);
        return res.json();
    });
    if (isLoading || !data) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsx(Skeleton, { className: "h-7 w-48" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: [1, 2, 3, 4].map((i) => _jsx(Skeleton, { className: "h-24 rounded-xl" }, i)) })] }) }));
    }
    const earningsThisMonth = data.commissionThisMonth + data.streakBonusThisMonth;
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Dashboard" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Your performance this month" })] }), data.nextTier && (_jsx("div", { className: "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4", children: _jsxs("p", { className: "text-sm font-medium text-indigo-900 dark:text-indigo-300", children: [data.nextTier.dealsNeeded, " more deal", data.nextTier.dealsNeeded !== 1 ? 's' : '', " this month to unlock a", ' ', _jsxs("span", { className: "font-bold", children: [inr(data.nextTier.bonusAmount), " streak bonus"] }), " per deal"] }) })), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3", children: "This Month" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: [
                                { label: 'Deals Closed', value: data.dealsThisMonth.toString() },
                                { label: 'Total Earnings', value: inr(earningsThisMonth) },
                                { label: 'Commission', value: inr(data.commissionThisMonth) },
                                { label: 'Streak Bonuses', value: inr(data.streakBonusThisMonth) },
                            ].map(({ label, value }) => (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4", children: [_jsx("p", { className: "text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide", children: label }), _jsx("p", { className: "text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight", children: value })] }, label))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3", children: "All Time" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: [
                                { label: 'Total Deals', value: data.allTimeDeals.toString() },
                                { label: 'Total Earnings', value: inr(data.allTimeEarnings) },
                            ].map(({ label, value }) => (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4", children: [_jsx("p", { className: "text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide", children: label }), _jsx("p", { className: "text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight", children: value })] }, label))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/submissions'), className: "flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors", children: "Submit New Lead" }), data.pendingLeadsCount > 0 && (_jsxs("button", { onClick: () => navigate('/submissions'), className: "px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", children: [data.pendingLeadsCount, " pending"] }))] })] }) }));
}
