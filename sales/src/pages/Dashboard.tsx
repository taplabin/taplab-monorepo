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

const STAT_ICONS = {
  deals: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  earnings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  commission: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  streak: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useSWR('/api/broker/dashboard', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<DashboardData>;
  });

  if (isLoading || !data || !('dealsThisMonth' in data)) {
    return (
      <Layout>
        <div className="max-w-4xl space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const earningsThisMonth = data.commissionThisMonth + data.streakBonusThisMonth;
  const streakContribution = earningsThisMonth > 0 ? Math.round((data.streakBonusThisMonth / earningsThisMonth) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your performance this month</p>
        </div>

        {/* This month — hero stats */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">This Month</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 dark:divide-gray-800">
            {[
              { label: 'Deals Closed', value: data.dealsThisMonth.toString(), icon: STAT_ICONS.deals, accent: 'text-[#2087e6]', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Total Earnings', value: inr(earningsThisMonth), icon: STAT_ICONS.earnings, accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Commission', value: inr(data.commissionThisMonth), icon: STAT_ICONS.commission, accent: 'text-gray-900 dark:text-white', bg: 'bg-gray-50 dark:bg-gray-800' },
              { label: 'Streak Bonus', value: inr(data.streakBonusThisMonth), icon: STAT_ICONS.streak, accent: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            ].map(({ label, value, icon, accent, bg }) => (
              <div key={label} className="px-5 py-5">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3 ${accent}`}>
                  {icon}
                </div>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-bold ${accent} mt-1 tracking-tight`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Streak progress */}
        {data.nextTier && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Streak Progress</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {data.nextTier.dealsNeeded} more deal{data.nextTier.dealsNeeded !== 1 ? 's' : ''} to unlock{' '}
                  <span className="font-semibold text-orange-500 dark:text-orange-400">{inr(data.nextTier.bonusAmount)} bonus/deal</span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 dark:text-orange-400 flex-shrink-0">
                {STAT_ICONS.streak}
              </div>
            </div>
            {streakContribution > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                  <span>Streak contribution</span>
                  <span>{streakContribution}% of earnings</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 dark:bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min(streakContribution, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending leads alert */}
        {data.pendingLeadsCount > 0 && (
          <button
            onClick={() => navigate('/submissions')}
            className="w-full flex items-center gap-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl px-5 py-4 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                {data.pendingLeadsCount} lead{data.pendingLeadsCount !== 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">Tap to view your submissions</p>
            </div>
            <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* All time + Sales Manual side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* All time stats */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">All Time</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
              {[
                { label: 'Total Deals', value: data.allTimeDeals.toString() },
                { label: 'Total Earned', value: inr(data.allTimeEarnings) },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 py-5">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Manual */}
          <a
            href="/TapLab-Broker-Sales-Manual.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 text-[#2087e6] dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#2087e6] dark:group-hover:text-blue-400 transition-colors">Sales Manual</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Rules, scripts, and everything you need to close deals</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Submit action */}
        <button
          onClick={() => navigate('/submissions')}
          className="w-full py-3 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Submit New Lead
        </button>
      </div>
    </Layout>
  );
}
