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
  { label: 'All',       value: 'all' },
  { label: 'Active',    value: 'active' },
  { label: 'Free Trial',value: 'trial' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Inactive',  value: 'inactive' },
];

const ROW_BG: Record<DisplayStatus, string> = {
  active:    '',
  trial:     'bg-blue-50',
  cancelled: 'bg-yellow-50',
  inactive:  'bg-red-50',
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

  if (isLoading) return <Layout><div className="text-center py-12">Loading...</div></Layout>;
  if (error) return <Layout><div className="text-center py-12 text-red-600">Error loading businesses: {error.message}</div></Layout>;

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Businesses</h1>
            <p className="mt-2 text-sm text-gray-700">
              All businesses with their subscription and deployment status.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/businesses/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add business
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  activeTab === tab.value
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Business</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Slug</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Subscription</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Page</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Billing</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                          No businesses in this category.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((business) => (
                        <tr key={business.businessSlug} className={ROW_BG[business.displayStatus]}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {business.businessName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {business.businessSlug}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={business.displayStatus} />
                              {business.displayStatus === 'trial' && business.trialStartDate && (
                                <span className="text-xs text-gray-400">
                                  Ends {new Date(business.trialStartDate.seconds * 1000 + business.trialDurationDays * 86400000).toLocaleDateString()}
                                </span>
                              )}
                              {business.displayStatus === 'cancelled' && business.subscriptionEndsAt && (
                                <span className="text-xs text-gray-400">
                                  Live until {new Date(business.subscriptionEndsAt.seconds * 1000).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {business.pageStatus === 'deployed'
                              ? `Deployed (${business.pageVersion?.slice(0, 8)})`
                              : 'Awaiting deployment'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            ₹{business.pricingAmount}/{business.billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link to={`/business/${business.businessSlug}`} className="text-indigo-600 hover:text-indigo-900">
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
      </div>
    </Layout>
  );
}
