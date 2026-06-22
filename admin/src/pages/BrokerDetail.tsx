import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface Deal {
  slug: string;
  businessName: string;
  setupFee: number | null;
  commissionPercent: number | null;
  commissionPaid: boolean;
  subscriptionStatus: string;
  createdAt: { seconds: number };
}

interface BrokerWithDeals {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  bankVerified: boolean;
  razorpayFundAccountId: string | null;
  deals: Deal[];
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function commissionAmount(deal: Deal): number {
  if (!deal.setupFee || !deal.commissionPercent) return 0;
  return Math.round((deal.commissionPercent / 100) * deal.setupFee);
}

export default function BrokerDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [toggling, setToggling] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null); // null = not yet initialised from broker data
  const [savingNotes, setSavingNotes] = useState(false);

  const { data: broker, isLoading, mutate } = useSWR(
    `/api/admin/brokers/${id}`,
    async (url) => {
      const res = await adminFetch(url);
      if (!res.ok) throw new Error('Broker not found');
      const data = (await res.json()) as BrokerWithDeals;
      // Initialise notes state from fetched data (only on first load)
      setNotes((prev) => prev === null ? (data.notes ?? '') : prev);
      return data;
    }
  );

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await adminFetch(`/api/admin/brokers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast('Notes saved');
      mutate((prev) => prev ? { ...prev, notes: notes ?? '' } : prev, false);
    } catch {
      toast('Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggle = async (deal: Deal) => {
    if (toggling) return;
    setToggling(deal.slug);

    // Optimistic update
    mutate(
      (prev) =>
        prev
          ? { ...prev, deals: prev.deals.map((d) => d.slug === deal.slug ? { ...d, commissionPaid: !d.commissionPaid } : d) }
          : prev,
      false
    );

    try {
      const res = await adminFetch(`/api/admin/business/${deal.slug}/toggle-commission-paid`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast(deal.commissionPaid ? 'Marked as unpaid' : 'Marked as paid');
    } catch {
      // Revert on failure
      mutate(
        (prev) =>
          prev
            ? { ...prev, deals: prev.deals.map((d) => d.slug === deal.slug ? { ...d, commissionPaid: deal.commissionPaid } : d) }
            : prev,
        false
      );
      toast('Failed to update — try again', 'error');
    } finally {
      setToggling(null);
    }
  };

  if (isLoading || !broker) {
    return (
      <Layout>
        <div className="max-w-2xl space-y-5 animate-pulse">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </Layout>
    );
  }

  const totalCommission = broker.deals.reduce((sum, d) => sum + commissionAmount(d), 0);
  const paidCommission = broker.deals.filter((d) => d.commissionPaid).reduce((sum, d) => sum + commissionAmount(d), 0);
  const outstanding = totalCommission - paidCommission;

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/brokers"
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{broker.name}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {broker.phone}{broker.email ? ` · ${broker.email}` : ''}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total deals', value: broker.deals.length.toString() },
            { label: 'Total commission', value: inr(totalCommission) },
            { label: 'Outstanding', value: inr(outstanding), highlight: outstanding > 0 },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold mt-1 tracking-tight ${highlight ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Bank Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bank Details</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              broker.bankVerified
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            }`}>
              {broker.bankVerified ? 'Verified' : 'Awaiting verification'}
            </span>
          </div>
          <dl className="space-y-2">
            {[
              { label: 'Account', value: broker.bankAccountNumber ?? '—' },
              { label: 'IFSC', value: broker.bankIfsc ?? '—' },
              { label: 'UPI', value: broker.upiId ?? '—' },
              { label: 'RazorpayX Fund Account', value: broker.razorpayFundAccountId ?? 'Not created yet' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-xs text-gray-400 dark:text-gray-500">{label}</dt>
                <dd className="text-xs font-medium text-gray-900 dark:text-white font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Deal stack */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Deals</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Newest first — tap to mark commission as paid</p>
          </div>

          {broker.deals.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No deals yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {broker.deals.map((deal) => {
                const commission = commissionAmount(deal);
                return (
                  <div key={deal.slug} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/business/${deal.slug}`}
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {deal.businessName}
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {deal.setupFee
                          ? `${inr(deal.setupFee)} setup · ${deal.commissionPercent}% = ${inr(commission)}`
                          : 'No setup fee'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggle(deal)}
                      disabled={toggling === deal.slug}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                        deal.commissionPaid
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deal.commissionPaid ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      {deal.commissionPaid ? 'Paid' : 'Unpaid'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Internal Notes</h2>
          <textarea
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Payment preferences, relationship notes, anything useful…"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes || notes === (broker?.notes ?? '')}
            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {savingNotes ? 'Saving…' : 'Save Notes'}
          </button>
        </div>

      </div>
    </Layout>
  );
}
