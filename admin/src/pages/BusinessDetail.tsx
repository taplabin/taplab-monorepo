import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive';
  freeTrialEnabled: boolean;
  trialStartDate: any;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageJsUrl: string | null;
  componentTagName: string | null;
  pageVersion: string | null;
  pageStatus: 'no_page' | 'deployed';
  lastDeployedAt: any;
  razorpaySubscriptionId: string | null;
  razorpayPaymentLink: string | null;
  createdAt: any;
}

interface PaymentsData {
  payments: any[];
  message?: string;
}

function RefreshLinkButton({
  label,
  onFetch,
}: {
  label: string;
  onFetch: () => Promise<string>;
}) {
  const [link, setLink] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setLink(null);
    try {
      setLink(await onFetch());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Fetching...' : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {link && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={link}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BusinessDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: business, error: businessError } = useSWR(
    slug ? `/api/admin/business/${slug}` : null,
    async (url) => {
      const res = await adminFetch(url);
      return (await res.json()) as Business;
    }
  );

  const { data: paymentsData } = useSWR(
    slug ? `/api/admin/business/${slug}/payments` : null,
    async (url) => {
      const res = await adminFetch(url);
      return (await res.json()) as PaymentsData;
    }
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (businessError) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600">
          Error loading business: {businessError.message}
        </div>
      </Layout>
    );
  }

  if (!business) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            to="/businesses"
            className="text-indigo-600 hover:text-indigo-900 text-sm"
          >
            ← Back to businesses
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {business.businessName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">/{business.businessSlug}</p>
              </div>
              <StatusBadge status={business.subscriptionStatus} />
            </div>
          </div>

          {/* Owner Invite */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Owner Invite Link</h2>
            <p className="text-sm text-gray-500 mb-4">
              Get a fresh Firebase password-set link to send to the business owner. Valid for 1 hour.
            </p>
            <RefreshLinkButton
              label="Get Invite Link"
              onFetch={async () => {
                const res = await adminFetch(`/api/admin/business/${slug}/refresh-invite`, { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || data.message || data.error || 'Failed');
                return data.inviteLink;
              }}
            />
          </div>

          {/* Subscription Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Subscription Details
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Pricing</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ₹{business.pricingAmount}/{business.billingCycle === 'monthly' ? 'month' : 'year'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Free Trial</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {business.freeTrialEnabled
                    ? `Enabled (${business.trialDurationDays} days)`
                    : 'Disabled'}
                </dd>
              </div>
              {business.razorpayPaymentLink && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Payment Link
                  </dt>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={business.razorpayPaymentLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(business.razorpayPaymentLink!)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                    >
                      Copy
                    </button>
                  </div>
                  <RefreshLinkButton
                    label="Refresh Payment Link"
                    onFetch={async () => {
                      const res = await adminFetch(`/api/admin/business/${slug}/refresh-payment-link`, { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.detail || data.message || data.error || 'Failed');
                      return data.paymentLink;
                    }}
                  />
                </div>
              )}
            </dl>
          </div>

          {/* Page Deployment */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Page Deployment
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {business.pageStatus === 'deployed' ? (
                    <span className="text-green-600 font-medium">Deployed</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">Awaiting Deployment</span>
                  )}
                </dd>
              </div>
              {business.pageVersion && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {business.pageVersion}
                  </dd>
                </div>
              )}
              {business.componentTagName && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Component Tag</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {business.componentTagName}
                  </dd>
                </div>
              )}
              {business.pageJsUrl && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">CDN URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                    {business.pageJsUrl}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Payments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Payment History
            </h2>
            {paymentsData?.payments && paymentsData.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="py-3 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th className="py-3 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentsData.payments.map((payment: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3 text-sm text-gray-900">
                          {new Date(payment.created_at * 1000).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-sm text-gray-900">
                          ₹{(payment.amount / 100).toFixed(2)}
                        </td>
                        <td className="py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {paymentsData?.message || 'No payment history available'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
