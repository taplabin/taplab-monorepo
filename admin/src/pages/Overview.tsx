import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive';
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageStatus: 'no_page' | 'deployed';
}

function isInTrial(business: Business): boolean {
  if (!business.freeTrialEnabled || !business.trialStartDate) return false;
  const trialEnd =
    business.trialStartDate.seconds * 1000 +
    business.trialDurationDays * 24 * 60 * 60 * 1000;
  return Date.now() < trialEnd;
}

function isTrialExpiringSoon(business: Business, days: number): boolean {
  if (!isInTrial(business)) return false;
  const trialEnd =
    business.trialStartDate!.seconds * 1000 +
    business.trialDurationDays * 24 * 60 * 60 * 1000;
  const daysUntilExpiry = (trialEnd - Date.now()) / (24 * 60 * 60 * 1000);
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
}

export default function Overview() {
  const { data: businesses } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  if (!businesses) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  const stats = {
    totalActive: businesses.filter((b) => b.subscriptionStatus === 'active').length,
    totalInactive: businesses.filter((b) => b.subscriptionStatus === 'inactive')
      .length,
    totalTrial: businesses.filter((b) => isInTrial(b)).length,
    noPage: businesses.filter((b) => b.pageStatus === 'no_page').length,
    mrr: businesses
      .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'monthly')
      .reduce((sum, b) => sum + b.pricingAmount, 0),
    arr: businesses
      .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'yearly')
      .reduce((sum, b) => sum + b.pricingAmount, 0),
    trialsExpiringSoon: businesses.filter((b) => isTrialExpiringSoon(b, 7)),
  };

  const statCards = [
    { label: 'Active Subscriptions', value: stats.totalActive, color: 'green' },
    { label: 'Inactive', value: stats.totalInactive, color: 'red' },
    { label: 'Free Trials', value: stats.totalTrial, color: 'blue' },
    { label: 'Awaiting Page', value: stats.noPage, color: 'yellow' },
    { label: 'MRR', value: `₹${stats.mrr.toLocaleString()}`, color: 'indigo' },
    { label: 'ARR', value: `₹${stats.arr.toLocaleString()}`, color: 'purple' },
  ];

  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={`overflow-hidden rounded-lg ${
                colorClasses[stat.color as keyof typeof colorClasses]
              } px-4 py-5 shadow sm:p-6`}
            >
              <dt className="truncate text-sm font-medium">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight">
                {stat.value}
              </dd>
            </div>
          ))}
        </div>

        {/* Trials Expiring Soon */}
        {stats.trialsExpiringSoon.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4">
              ⚠️ Trials Expiring Soon (Next 7 Days)
            </h2>
            <div className="space-y-2">
              {stats.trialsExpiringSoon.map((business) => {
                const trialEnd =
                  business.trialStartDate!.seconds * 1000 +
                  business.trialDurationDays * 24 * 60 * 60 * 1000;
                const daysLeft = Math.ceil(
                  (trialEnd - Date.now()) / (24 * 60 * 60 * 1000)
                );
                return (
                  <div
                    key={business.businessSlug}
                    className="flex items-center justify-between bg-white rounded-md p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {business.businessName}
                      </p>
                      <p className="text-sm text-gray-500">/{business.businessSlug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-700">
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </p>
                      <Link
                        to={`/business/${business.businessSlug}`}
                        className="text-xs text-indigo-600 hover:text-indigo-900"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/businesses/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
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
