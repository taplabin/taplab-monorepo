import React from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge, { DisplayStatus } from '../components/StatusBadge';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt?: { seconds: number } | null;
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pageStatus: 'no_page' | 'deployed';
  pageVersion: string | null;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  createdAt: { seconds: number };
  pageViews?: number;
}

type FilterTab = DisplayStatus | 'all';

function getDisplayStatus(b: Business): DisplayStatus {
  if (b.subscriptionStatus === 'active') return 'active';
  if (b.subscriptionStatus === 'cancelled') return 'cancelled';
  if (b.freeTrialEnabled && b.trialStartDate) {
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 24 * 60 * 60 * 1000;
    if (Date.now() < trialEnd) return 'trial';
  }
  return 'inactive';
}

const TABS: { label: string; value: FilterTab }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Active',     value: 'active' },
  { label: 'Free Trial', value: 'trial' },
  { label: 'Cancelled',  value: 'cancelled' },
  { label: 'Inactive',   value: 'inactive' },
];

const ROW_BG: Record<DisplayStatus, string> = {
  active:    '',
  trial:     'bg-blue-50 dark:bg-blue-900/10',
  cancelled: 'bg-yellow-50 dark:bg-yellow-900/10',
  inactive:  'bg-red-50 dark:bg-red-900/10',
};

export default function BusinessList() {
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all');

  const { data, error, isLoading } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  const enriched = React.useMemo(
    () => (data ?? []).map((b) => ({ ...b, displayStatus: getDisplayStatus(b) })),
    [data]
  );

  const filtered = React.useMemo(() => {
    if (activeTab === 'all') return enriched;
    return enriched.filter((b) => b.displayStatus === activeTab);
  }, [enriched, activeTab]);

  const counts = React.useMemo(() => {
    const base = { all: enriched.length, active: 0, trial: 0, cancelled: 0, inactive: 0 };
    enriched.forEach((b) => { base[b.displayStatus]++; });
    return base;
  }, [enriched]);

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600 dark:text-red-400">
          Error loading businesses: {error.message}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Businesses</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              All businesses with their subscription and deployment status.
            </p>
          </div>
          <Link
            to="/businesses/new"
            className="flex-shrink-0 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors"
          >
            Add business
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.value
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  activeTab === tab.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Table */}
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 overflow-x-auto">
          <div className="inline-block min-w-full align-middle px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Business</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Slug</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Subscription</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Page</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Billing</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Views</th>
                    <th className="relative py-3 pl-3 pr-4"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                        No businesses in this category.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((business) => (
                      <tr key={business.businessSlug} className={ROW_BG[business.displayStatus]}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                          {business.businessName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {business.businessSlug}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={business.displayStatus} />
                            {business.displayStatus === 'trial' && business.trialStartDate && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                Ends {new Date(business.trialStartDate.seconds * 1000 + business.trialDurationDays * 86400000).toLocaleDateString('en-IN')}
                              </span>
                            )}
                            {business.displayStatus === 'cancelled' && business.subscriptionEndsAt && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                Live until {new Date(business.subscriptionEndsAt.seconds * 1000).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {business.pageStatus === 'deployed'
                            ? `Deployed (${business.pageVersion?.slice(0, 8)})`
                            : 'Awaiting deployment'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          ₹{business.pricingAmount}/{business.billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {(business.pageViews ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <Link to={`/business/${business.businessSlug}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
