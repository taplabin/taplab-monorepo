import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt?: { seconds: number } | null;
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageStatus: 'no_page' | 'deployed';
  pageViews?: number;
}

type DisplayStatus = 'active' | 'trial' | 'cancelled' | 'inactive';

function getDisplayStatus(b: Business): DisplayStatus {
  if (b.subscriptionStatus === 'active') return 'active';
  if (b.subscriptionStatus === 'cancelled') return 'cancelled';
  if (b.freeTrialEnabled && b.trialStartDate) {
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 24 * 60 * 60 * 1000;
    if (Date.now() < trialEnd) return 'trial';
  }
  return 'inactive';
}

function isTrialExpiringSoon(b: Business): boolean {
  if (!b.freeTrialEnabled || !b.trialStartDate) return false;
  const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 24 * 60 * 60 * 1000;
  const daysLeft = (trialEnd - Date.now()) / (24 * 60 * 60 * 1000);
  return daysLeft <= 7 && daysLeft > 0;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

export default function Overview() {
  const { data: businesses, isLoading } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  if (isLoading || !businesses) {
    return (
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </Layout>
    );
  }

  const statuses = businesses.map(getDisplayStatus);
  const counts = {
    active:    statuses.filter((s) => s === 'active').length,
    trial:     statuses.filter((s) => s === 'trial').length,
    cancelled: statuses.filter((s) => s === 'cancelled').length,
    inactive:  statuses.filter((s) => s === 'inactive').length,
    noPage:    businesses.filter((b) => b.pageStatus === 'no_page').length,
  };

  const mrr = businesses
    .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'monthly')
    .reduce((sum, b) => sum + b.pricingAmount, 0);

  const arr = businesses
    .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'yearly')
    .reduce((sum, b) => sum + b.pricingAmount, 0);

  const totalPageViews = businesses.reduce((sum, b) => sum + (b.pageViews ?? 0), 0);

  const trialsExpiringSoon = businesses.filter(isTrialExpiringSoon);

  const statCards = [
    { label: 'Active', value: counts.active, color: 'green' },
    { label: 'Free Trial', value: counts.trial, color: 'blue' },
    { label: 'Cancelled', value: counts.cancelled, color: 'yellow' },
    { label: 'Inactive', value: counts.inactive, color: 'red' },
    { label: 'MRR', value: `₹${mrr.toLocaleString('en-IN')}`, color: 'indigo' },
    { label: 'ARR', value: `₹${arr.toLocaleString('en-IN')}`, color: 'purple' },
    { label: 'Awaiting Page', value: counts.noPage, color: 'gray' },
    { label: 'Total Page Views', value: totalPageViews.toLocaleString('en-IN'), color: 'teal' },
  ];

  const colorClasses: Record<string, string> = {
    green:  'bg-green-50 text-green-700 border-green-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray:   'bg-gray-50 text-gray-700 border-gray-200',
    teal:   'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border px-4 py-5 ${colorClasses[stat.color]}`}
            >
              <p className="text-xs font-medium truncate mb-1">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {trialsExpiringSoon.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-8">
            <h2 className="text-sm font-semibold text-yellow-900 mb-3">Trials expiring in 7 days</h2>
            <div className="space-y-2">
              {trialsExpiringSoon.map((b) => {
                const trialEnd = b.trialStartDate!.seconds * 1000 + b.trialDurationDays * 86400000;
                const daysLeft = Math.ceil((trialEnd - Date.now()) / 86400000);
                return (
                  <div key={b.businessSlug} className="flex items-center justify-between bg-white rounded-md px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.businessName}</p>
                      <p className="text-xs text-gray-400">/{b.businessSlug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-700">{daysLeft}d left</p>
                      <Link to={`/business/${b.businessSlug}`} className="text-xs text-indigo-600 hover:text-indigo-800">
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/businesses/new"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add New Business
            </Link>
            <Link
              to="/businesses"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View All Businesses
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
