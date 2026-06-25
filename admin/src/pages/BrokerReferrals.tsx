import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

type ReferralStatus = 'pending' | 'converted' | 'rejected';

interface BrokerReferral {
  id: string;
  referringBrokerId: string;
  name: string;
  phone: string;
  email: string;
  status: ReferralStatus;
  rejectionReason?: string;
  createdAt: { seconds: number };
}

interface Broker {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<ReferralStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  converted: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

export default function BrokerReferrals() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  const { data: referrals, isLoading } = useSWR(
    `/api/admin/broker-referrals${tab === 'pending' ? '?status=pending' : ''}`,
    async (url: string) => {
      const res = await adminFetch(url);
      return (await res.json()).referrals as BrokerReferral[];
    }
  );

  const { data: brokers } = useSWR('/api/admin/brokers', async (url: string) => {
    const res = await adminFetch(url);
    return (await res.json()).brokers as Broker[];
  });

  const brokerMap = new Map<string, string>(brokers?.map((b): [string, string] => [b.id, b.name]) ?? []);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Broker Referrals</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Broker-to-broker referrals submitted through the sales portal</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!referrals || referrals.length === 0) && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No {tab === 'pending' ? 'pending' : ''} referrals.
              </p>
            </div>
          )}

          {!isLoading && referrals && referrals.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referrals.map((r) => (
                <div
                  key={r.id}
                  onClick={() => r.status === 'pending' && navigate(`/brokers/new?referralId=${r.id}`)}
                  className={`flex items-center justify-between px-5 py-4 ${r.status === 'pending' ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.phone} · {r.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Referred by {brokerMap.get(r.referringBrokerId) ?? r.referringBrokerId}
                    </p>
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">{r.rejectionReason}</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
