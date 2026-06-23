import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

export default function Team() {
  const navigate = useNavigate();

  const { data } = useSWR('/api/broker/team', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).brokers as any[];
  });

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Everyone on the TapLab sales network</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!data ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : data.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">No team members yet.</p>
          ) : data.map((broker: any) => (
            <button
              key={broker.id}
              onClick={() => navigate(`/profile/${broker.id}`)}
              className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left w-full"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                {broker.photoUrl ? (
                  <img src={broker.photoUrl} alt={broker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                    {broker.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{broker.name}</p>
                {broker.city && <p className="text-xs text-gray-400 dark:text-gray-500">{broker.city}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {broker.dealsThisMonth} this month · {broker.dealsAllTime} all time
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
