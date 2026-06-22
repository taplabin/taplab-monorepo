import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Earnings() {
  const { data } = useSWR('/api/broker/earnings', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{
      earnings: { slug: string; businessName: string; commissionAmount: number; commissionPaidAt: any; streakBonus: number | null; streakBonusPaidAt: any }[];
      totalEarnings: number;
    }>;
  });

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">All payouts received from TapLab</p>
        </div>

        {/* Total */}
        {data && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inr(data.totalEarnings)}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!data ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : data.earnings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No payouts yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Payouts appear here once a client subscribes.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.earnings.map((e) => (
                <div key={e.slug} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.businessName}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {inr((e.commissionAmount ?? 0) + (e.streakBonus ?? 0))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Commission {inr(e.commissionAmount ?? 0)}
                      {e.streakBonus ? ` + ${inr(e.streakBonus)} streak bonus` : ''}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(e.commissionPaidAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
