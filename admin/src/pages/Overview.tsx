import { useState } from 'react';
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

interface Costs {
  railway: string;
  domain: string;
  other: string;
}

function getDisplayStatus(b: Business): DisplayStatus {
  if (b.subscriptionStatus === 'active') return 'active';
  if (b.subscriptionStatus === 'cancelled') return 'cancelled';
  if (b.freeTrialEnabled && b.trialStartDate) {
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
    if (Date.now() < trialEnd) return 'trial';
  }
  return 'inactive';
}

function isTrialExpiringSoon(b: Business): boolean {
  if (!b.freeTrialEnabled || !b.trialStartDate) return false;
  const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
  const daysLeft = (trialEnd - Date.now()) / 86400000;
  return daysLeft <= 7 && daysLeft > 0;
}

function toMRR(b: Business): number {
  return b.billingCycle === 'monthly' ? b.pricingAmount : b.pricingAmount / 12;
}

function toNum(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

function loadCosts(): Costs {
  try {
    const saved = localStorage.getItem('taplab-admin-costs');
    if (saved) return { railway: '', domain: '', other: '', ...JSON.parse(saved) };
  } catch {}
  return { railway: '', domain: '', other: '' };
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-5 animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
    </div>
  );
}

export default function Overview() {
  const [costs, setCosts] = useState<Costs>(loadCosts);

  const updateCost = (key: keyof Costs, value: string) => {
    const next = { ...costs, [key]: value };
    setCosts(next);
    localStorage.setItem('taplab-admin-costs', JSON.stringify(next));
  };

  const { data: businesses, isLoading } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  if (isLoading || !businesses) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-40" />
          <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
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

  // Financial calculations
  const activePayers = businesses.filter((b) => b.subscriptionStatus === 'active');
  const trialBusinesses = businesses.filter((b) => getDisplayStatus(b) === 'trial');
  const atRiskBusinesses = businesses.filter((b) =>
    b.subscriptionStatus === 'inactive' || b.subscriptionStatus === 'cancelled'
  );

  const effectiveMRR = activePayers.reduce((sum, b) => sum + toMRR(b), 0);
  const projectedARR = effectiveMRR * 12;
  const revenueAtRisk = atRiskBusinesses.reduce((sum, b) => sum + toMRR(b), 0);
  const trialPipeline = trialBusinesses.reduce((sum, b) => sum + toMRR(b), 0);

  const totalCosts = toNum(costs.railway) + toNum(costs.domain) + toNum(costs.other);
  const netProfit = effectiveMRR - totalCosts;
  const profitMargin = effectiveMRR > 0 ? Math.round((netProfit / effectiveMRR) * 100) : 0;

  // Existing simple MRR/ARR (raw monthly + raw yearly)
  const rawMRR = businesses
    .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'monthly')
    .reduce((sum, b) => sum + b.pricingAmount, 0);
  const rawARR = businesses
    .filter((b) => b.subscriptionStatus === 'active' && b.billingCycle === 'yearly')
    .reduce((sum, b) => sum + b.pricingAmount, 0);

  const totalPageViews = businesses.reduce((sum, b) => sum + (b.pageViews ?? 0), 0);
  const trialsExpiringSoon = businesses.filter(isTrialExpiringSoon);

  const colorClasses: Record<string, string> = {
    green:  'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    gray:   'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  };

  const opStatCards = [
    { label: 'Active',           value: counts.active,                          color: 'green' },
    { label: 'Free Trial',       value: counts.trial,                           color: 'blue' },
    { label: 'Cancelled',        value: counts.cancelled,                       color: 'yellow' },
    { label: 'Inactive',         value: counts.inactive,                        color: 'red' },
    { label: 'Monthly Rev.',     value: inr(rawMRR),                            color: 'indigo' },
    { label: 'Annual Rev.',      value: inr(rawARR),                            color: 'purple' },
    { label: 'Awaiting Page',    value: counts.noPage,                          color: 'gray' },
    { label: 'Total Page Views', value: totalPageViews.toLocaleString('en-IN'), color: 'teal' },
  ];

  const inputClass = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow';

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Overview</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{businesses.length} total businesses</p>
        </div>

        {/* ── Financial Health ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Financial Health</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Effective MRR normalises yearly subscriptions to monthly equivalent</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 dark:divide-gray-800">
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Effective MRR</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{inr(effectiveMRR)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activePayers.length} paying subscriber{activePayers.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Projected ARR</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{inr(projectedARR)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">if current MRR holds</p>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Revenue at Risk</p>
              <p className={`text-2xl font-bold tracking-tight ${revenueAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {inr(revenueAtRisk)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{atRiskBusinesses.length} inactive or cancelled</p>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Trial Pipeline</p>
              <p className={`text-2xl font-bold tracking-tight ${trialPipeline > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                {inr(trialPipeline)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">potential MRR if {trialBusinesses.length} trial{trialBusinesses.length !== 1 ? 's' : ''} convert</p>
            </div>
          </div>
        </div>

        {/* ── Net Profit ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-start justify-between gap-6 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Net Profit</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Effective MRR minus your monthly costs — saved locally</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-2xl font-bold tracking-tight ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{inr(netProfit)}<span className="text-sm font-normal">/mo</span>
              </p>
              {effectiveMRR > 0 && (
                <p className={`text-xs mt-0.5 ${profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {profitMargin}% margin
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { key: 'railway', label: 'Railway (hosting)' },
              { key: 'domain',  label: 'Domain / GoDaddy' },
              { key: 'other',   label: 'Other' },
            ] as { key: keyof Costs; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">₹</span>
                  <input
                    type="number"
                    value={costs[key]}
                    onChange={(e) => updateCost(key, e.target.value)}
                    placeholder="0"
                    min="0"
                    className={`${inputClass} pl-6`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Effective MRR</p>
              <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{inr(effectiveMRR)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">Total costs/mo</p>
              <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{inr(totalCosts)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500">Net</p>
              <p className={`font-semibold mt-0.5 ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{inr(netProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Operational stats ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Operational</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {opStatCards.map((stat) => (
              <div key={stat.label} className={`rounded-xl border px-4 py-5 ${colorClasses[stat.color]}`}>
                <p className="text-xs font-medium truncate mb-1 opacity-80">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trials expiring banner ── */}
        {trialsExpiringSoon.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-3">
              Trials expiring in 7 days
            </h2>
            <div className="space-y-2">
              {trialsExpiringSoon.map((b) => {
                const trialEnd = b.trialStartDate!.seconds * 1000 + b.trialDurationDays * 86400000;
                const daysLeft = Math.ceil((trialEnd - Date.now()) / 86400000);
                return (
                  <div key={b.businessSlug} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 border border-yellow-100 dark:border-yellow-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{b.businessName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">/{b.businessSlug} · potential {inr(toMRR(b))}/mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{daysLeft}d left</p>
                      <Link to={`/business/${b.businessSlug}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/businesses/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Add New Business
            </Link>
            <Link
              to="/businesses"
              className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              View All Businesses
            </Link>
            <Link
              to="/alerts"
              className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              View Alerts
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
