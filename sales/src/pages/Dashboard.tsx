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
