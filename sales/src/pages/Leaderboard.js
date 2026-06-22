import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { auth } from '../lib/firebase';
export default function Leaderboard() {
    const [tab, setTab] = useState('monthly');
    const currentUid = auth.currentUser?.uid;
    const { data } = useSWR('/api/broker/leaderboard', async (url) => {
        const res = await brokerFetch(url);
        return res.json();
    });
    const { data: me } = useSWR('/api/broker/me', async (url) => {
        const res = await brokerFetch(url);
        return res.json();
    });
    const rows = data ? (tab === 'monthly' ? data.monthly : data.allTime) : null;
    const myId = me?.id;
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Leaderboard" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Rankings across the sales network" })] }), _jsx("div", { className: "flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit", children: ['monthly', 'allTime'].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`, children: t === 'monthly' ? 'This Month' : 'All Time' }, t))) }), _jsx("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: !rows ? (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: [1, 2, 3, 4, 5].map((i) => (_jsxs("div", { className: "px-5 py-4 flex items-center gap-4 animate-pulse", children: [_jsx(Skeleton, { className: "w-7 h-5" }), _jsx(Skeleton, { className: "h-4 flex-1 max-w-[150px]" }), _jsx(Skeleton, { className: "h-4 w-12 ml-auto" })] }, i))) })) : rows.length === 0 ? (_jsx("div", { className: "px-5 py-12 text-center", children: _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No data yet." }) })) : (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: rows.map((row, i) => {
                            const isMe = row.brokerId === myId;
                            const count = tab === 'monthly' ? row.dealsThisMonth : row.dealsAllTime;
                            return (_jsxs("div", { className: `flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`, children: [_jsx("span", { className: `text-sm font-bold w-7 text-center ${i < 3 ? ['text-yellow-500', 'text-gray-400', 'text-amber-600'][i] : 'text-gray-400 dark:text-gray-600'}`, children: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}` }), _jsxs("span", { className: `text-sm font-medium flex-1 ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`, children: [row.name, isMe ? ' (you)' : ''] }), _jsxs("span", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: [count, " deal", count !== 1 ? 's' : ''] })] }, row.brokerId));
                        }) })) })] }) }));
}
