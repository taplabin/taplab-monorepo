import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

interface Broker {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Business {
  brokerId: string | null;
  commissionPaid: boolean;
  setupFee: number | null;
  commissionPercent: number | null;
}

export default function Brokers() {
  const navigate = useNavigate();
  const { data: brokers, isLoading } = useSWR('/api/admin/brokers', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.brokers as Broker[];
  });

  const { data: businesses } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  const [search, setSearch] = useState('');

  const pendingPayouts = useMemo(() => {
    if (!brokers || !businesses) return [];
    return brokers
      .map((broker) => {
        const outstanding = businesses
          .filter((b) => b.brokerId === broker.id && !b.commissionPaid && b.setupFee && b.commissionPercent)
          .reduce((sum, b) => sum + Math.round((b.commissionPercent! / 100) * b.setupFee!), 0);
        return { ...broker, outstanding };
      })
      .filter((b) => b.outstanding > 0);
  }, [brokers, businesses]);

  const filteredBrokers = useMemo(() => {
    if (!brokers) return [];
    const q = search.toLowerCase().trim();
    if (!q) return brokers;
    return brokers.filter((b) =>
      b.name.toLowerCase().includes(q) || b.phone.includes(q) || b.email.toLowerCase().includes(q)
    );
  }, [brokers, search]);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Brokers</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Manage your broker and seller network</p>
          </div>
          <button
            onClick={() => navigate('/brokers/new')}
            className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add Broker
          </button>
        </div>

        {pendingPayouts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-3">Pending Payouts</h2>
            <div className="space-y-2">
              {pendingPayouts.map((broker) => (
                <div key={broker.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-800/50">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{broker.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{broker.phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      ₹{broker.outstanding.toLocaleString('en-IN')}
                    </p>
                    <Link to={`/broker/${broker.id}`} className="text-xs text-[#2087e6] dark:text-blue-400 hover:underline">
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && brokers && brokers.length > 0 && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brokers…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
            />
          </div>
        )}

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

          {!isLoading && (!brokers || brokers.length === 0) && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No brokers added yet.</p>
              <button onClick={() => navigate('/brokers/new')} className="mt-2 text-xs text-[#2087e6] hover:underline">Add your first broker →</button>
            </div>
          )}

          {!isLoading && brokers && brokers.length > 0 && filteredBrokers.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No brokers match "{search}"</p>
            </div>
          )}

          {!isLoading && filteredBrokers.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBrokers.map((broker) => (
                <Link
                  key={broker.id}
                  to={`/broker/${broker.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{broker.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {broker.phone}{broker.email ? ` · ${broker.email}` : ''}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
