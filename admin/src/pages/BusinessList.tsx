import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge, { DisplayStatus } from '../components/StatusBadge';

// Searchable broker filter combobox — value is 'all' | 'direct' | brokerId
function BrokerFilterCombobox({
  brokers,
  value,
  onChange,
}: {
  brokers: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label =
    value === 'all' ? 'All brokers' :
    value === 'direct' ? 'Direct (no broker)' :
    brokers.find((b) => b.id === value)?.name ?? 'All brokers';

  const filtered = query.trim()
    ? brokers.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
    : brokers;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function select(v: string) {
    onChange(v);
    setQuery('');
    setOpen(false);
  }

  const optionClass = (active: boolean) =>
    `w-full text-left px-3 py-2 text-sm transition-colors ${
      active
        ? 'bg-blue-50 dark:bg-blue-900/20 text-[#2087e6] dark:text-blue-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg cursor-text min-w-44"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search broker…"
            className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
        )}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {!query && (
              <>
                <button type="button" onClick={() => select('all')} className={optionClass(value === 'all')}>All brokers</button>
                <button type="button" onClick={() => select('direct')} className={optionClass(value === 'direct')}>Direct (no broker)</button>
                {brokers.length > 0 && <div className="border-t border-gray-100 dark:border-gray-800" />}
              </>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No brokers match</div>
            ) : (
              filtered.map((b) => (
                <button key={b.id} type="button" onClick={() => select(b.id)} className={optionClass(value === b.id)}>
                  {b.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  brokerId: string | null;
  brokerName: string | null;
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
  const [search, setSearch] = React.useState('');
  const [brokerFilter, setBrokerFilter] = React.useState('all'); // 'all' | 'direct' | brokerId

  const { data, error, isLoading } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  const enriched = React.useMemo(
    () => (data ?? []).map((b) => ({ ...b, displayStatus: getDisplayStatus(b) })),
    [data]
  );

  const brokerOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    enriched.forEach((b) => { if (b.brokerId && b.brokerName) seen.set(b.brokerId, b.brokerName); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [enriched]);

  const filtered = React.useMemo(() => {
    let list = activeTab === 'all' ? enriched : enriched.filter((b) => b.displayStatus === activeTab);
    if (brokerFilter === 'direct') list = list.filter((b) => !b.brokerId);
    else if (brokerFilter !== 'all') list = list.filter((b) => b.brokerId === brokerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.businessName.toLowerCase().includes(q) || b.businessSlug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, activeTab, brokerFilter, search]);

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
            className="flex-shrink-0 inline-flex items-center px-4 py-2 rounded-lg bg-[#2087e6] hover:bg-blue-600 text-sm font-medium text-white transition-colors"
          >
            Add business
          </Link>
        </div>

        {/* Search + broker filter */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
            />
          </div>
          {brokerOptions.length > 0 && (
            <BrokerFilterCombobox
              brokers={brokerOptions}
              value={brokerFilter}
              onChange={setBrokerFilter}
            />
          )}
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
                    ? 'border-[#2087e6] text-[#2087e6] dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  activeTab === tab.value
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-[#2087e6] dark:text-blue-400'
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
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Broker</th>
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
                          {business.brokerName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <Link to={`/business/${business.businessSlug}`} className="text-[#2087e6] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
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
