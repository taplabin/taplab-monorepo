import { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

type LeadStatus = 'pending' | 'approved' | 'rejected';

interface Lead {
  id: string;
  brokerId: string;
  brokerName: string;
  businessName: string;
  businessSlug: string;
  pricingAmount: number;
  billingCycle: string;
  setupFee: number;
  commissionPercent: number;
  status: LeadStatus;
  rejectionReason: string | null;
  createdAt: { seconds: number };
}

const TABS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

export default function Leads() {
  const [tab, setTab] = useState<LeadStatus>('pending');

  const { data, isLoading, error } = useSWR(`/api/admin/leads?status=${tab}`, async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to fetch leads');
    return json.leads as Lead[];
  });

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Client leads and broker referrals submitted by your sales network</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value as LeadStatus)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
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

          {!isLoading && error && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">Failed to load leads — try refreshing.</p>
            </div>
          )}

          {!isLoading && !error && (!data || data.length === 0) && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No {tab} leads.</p>
            </div>
          )}

          {!isLoading && !error && data && data.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.businessName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      by {lead.brokerName} · ₹{lead.pricingAmount.toLocaleString('en-IN')}/{lead.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      {lead.setupFee > 0 ? ` + ₹${lead.setupFee.toLocaleString('en-IN')} setup` : ''}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
