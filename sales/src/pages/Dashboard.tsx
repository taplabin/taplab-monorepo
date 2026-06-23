import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

interface DashboardData {
  dealsThisMonth: number;
  commissionThisMonth: number;
  streakBonusThisMonth: number;
  nextTier: { fromDeal: number; bonusAmount: number; dealsNeeded: number } | null;
  pendingLeadsCount: number;
  allTimeDeals: number;
  allTimeEarnings: number;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useSWR('/api/broker/dashboard', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<DashboardData>;
  });

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="max-w-2xl space-y-5">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const earningsThisMonth = data.commissionThisMonth + data.streakBonusThisMonth;

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your performance this month</p>
        </div>

        {/* Sales Manual banner */}
        <a
          href="/TapLab-Broker-Sales-Manual.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Sales Manual</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Rules, scripts, and everything you need to close deals</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Streak progress */}
        {data.nextTier && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {data.nextTier.dealsNeeded} more deal{data.nextTier.dealsNeeded !== 1 ? 's' : ''} this month to unlock a{' '}
              <span className="font-bold">{inr(data.nextTier.bonusAmount)} streak bonus</span> per deal
            </p>
          </div>
        )}

        {/* This month stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">This Month</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Deals Closed', value: data.dealsThisMonth.toString() },
              { label: 'Total Earnings', value: inr(earningsThisMonth) },
              { label: 'Commission', value: inr(data.commissionThisMonth) },
              { label: 'Streak Bonuses', value: inr(data.streakBonusThisMonth) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All time stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">All Time</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Deals', value: data.allTimeDeals.toString() },
              { label: 'Total Earnings', value: inr(data.allTimeEarnings) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/submissions')}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Submit New Lead
          </button>
          {data.pendingLeadsCount > 0 && (
            <button
              onClick={() => navigate('/submissions')}
              className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {data.pendingLeadsCount} pending
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
