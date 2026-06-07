import { useEffect, useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import { PageSkeleton } from '../components/Skeleton';

interface BillingData {
  plan: { amount: number; cycle: 'monthly' | 'yearly' };
  subscription: { status: string; currentEnd: number; paidCount: number } | null;
  invoices: Array<{ id: string; date: number; amount_paid: number; amount_due: number; status: string; short_url?: string }>;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function Billing() {
  const { business, loading: bizLoading } = useBusiness();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!business) return;
    portalFetch(`/api/portal/billing?slug=${business.slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBilling(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [business]);

  if (bizLoading || loading) return <Layout><PageSkeleton /></Layout>;

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Billing</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your plan and payment history</p>
        </div>

        {/* Plan summary */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Current Plan</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{billing?.plan.amount.toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              / {billing?.plan.cycle === 'monthly' ? 'month' : 'year'}
            </span>
          </div>

          {billing?.subscription && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{billing.subscription.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Next renewal</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(billing.subscription.currentEnd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Payments made</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{billing.subscription.paidCount}</span>
              </div>
            </div>
          )}

          {!billing?.subscription && business?.razorpayPaymentLink && (
            <div className="mt-4">
              <a
                href={business.razorpayPaymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Subscribe Now
              </a>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment History</p>
          </div>

          {!billing?.invoices.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No payments yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 w-1/3">Date</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Paid</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Due</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Status</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {billing.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-800 dark:text-gray-200">{formatAmount(inv.amount_paid)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-400 dark:text-gray-500">{formatAmount(inv.amount_due)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.short_url && (
                        <a href={inv.short_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
}
