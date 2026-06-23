import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { auth } from '../lib/firebase';

export default function Leaderboard() {
  const [tab, setTab] = useState<'monthly' | 'allTime'>('monthly');
  const currentUid = auth.currentUser?.uid;
  const navigate = useNavigate();

  const { data } = useSWR('/api/broker/leaderboard', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{
      monthly: { brokerId: string; name: string; dealsThisMonth: number; dealsAllTime: number }[];
      allTime: { brokerId: string; name: string; dealsThisMonth: number; dealsAllTime: number }[];
    }>;
  });

  const { data: me } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{ id: string }>;
  });

  const rows = data ? (tab === 'monthly' ? data.monthly : data.allTime) : null;
  const myId = me?.id;

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Rankings across the sales network</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['monthly', 'allTime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!rows ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <Skeleton className="w-7 h-5" />
                  <Skeleton className="h-4 flex-1 max-w-[150px]" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row, i) => {
                const isMe = row.brokerId === myId;
                const count = tab === 'monthly' ? row.dealsThisMonth : row.dealsAllTime;
                return (
                  <div key={row.brokerId} className={`flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                    <span className={`text-sm font-bold w-7 text-center ${i < 3 ? ['text-yellow-500', 'text-gray-400', 'text-amber-600'][i] : 'text-gray-400 dark:text-gray-600'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <button
                      onClick={() => navigate(`/profile/${row.brokerId}`)}
                      className={`text-sm font-medium flex-1 text-left hover:underline ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}
                    >
                      {row.name}{isMe ? ' (you)' : ''}
                    </button>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {count} deal{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
