import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge, { DisplayStatus } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
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
  setupFee: number | null;
  createdAt: any;
  ownerEmail: string | null;
  ownerUid: string | null;
  notes?: string;
  brokerId: string | null;
  brokerName: string | null;
  referralBonusPending: boolean;
  referralBonusSent: boolean;
  referralBonusAmount: number | null;
}

interface PaymentsData {
  payments: any[];
  message?: string;
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

function RefreshLinkButton({ label, onFetch }: { label: string; onFetch: () => Promise<string> }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Fetching...' : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {link && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={link}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

function ReferralBonusCard({ slug, brokerName }: { slug: string; brokerName: string }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setPaying(true);
    try {
      const res = await adminFetch(`/api/admin/business/${slug}/pay-referral-bonus`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Referral bonus sent via RazorpayX');
    } catch (err: any) {
      toast(err.message || 'Failed to send bonus', 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">Referral Bonus Pending</h2>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">
        {brokerName} was referred by another broker. Set the bonus amount and pay via RazorpayX.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (₹)"
          min="500"
          className="flex-1 px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handlePay}
          disabled={paying || !amount || parseFloat(amount) <= 0}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {paying ? 'Paying…' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}

export default function BusinessDetail() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();

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

  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailInviteLink, setEmailInviteLink] = useState<string | null>(null);
  const [ownerEmailSet, setOwnerEmailSet] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    if (business) setNotes(business.notes ?? '');
  }, [business]);

  const handleSetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    setEmailError(null);
    setEmailInviteLink(null);
    try {
      const res = await adminFetch(`/api/admin/business/${slug}/set-owner-email`, {
        method: 'POST',
        body: JSON.stringify({ ownerEmail: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to set email');
      setOwnerEmailSet(emailInput);
      setEmailInviteLink(data.inviteLink);
      toast('Owner email set — invite link ready');
    } catch (err: any) {
      setEmailError(err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      const res = await adminFetch(`/api/admin/business/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save notes');
      }
      toast('Notes saved');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setNotesSaving(false);
    }
  };

  if (businessError) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600 dark:text-red-400">
          Error loading business: {businessError.message}
        </div>
      </Layout>
    );
  }

  if (!business) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 animate-pulse">Loading...</div>
      </Layout>
    );
  }

  const resolvedOwnerEmail = ownerEmailSet ?? business.ownerEmail;
  const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6';
  const dtClass = 'text-sm font-medium text-gray-500 dark:text-gray-400';
  const ddClass = 'mt-1 text-sm text-gray-900 dark:text-gray-100';

  return (
    <Layout>
      <div className="space-y-5">
        <Link to="/businesses" className="inline-flex items-center gap-1 text-sm text-[#2087e6] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
          ← Back to businesses
        </Link>

        {/* Header */}
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{business.businessName}</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 font-mono">/{business.businessSlug}</p>
            </div>
            <StatusBadge status={getDisplayStatus(business)} />
          </div>
        </div>

        {/* Owner / Invite */}
        <div className={cardClass}>
          {resolvedOwnerEmail ? (
            <>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Owner Invite Link</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                <span className="font-medium text-gray-600 dark:text-gray-300">{resolvedOwnerEmail}</span>
                {' '}· Get a fresh Firebase password-set link. Valid for 1 hour.
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
              {emailInviteLink && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={emailInviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(emailInviteLink!); toast('Invite link copied'); }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Set Owner Email</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                No owner email yet. Add one to create a portal account and generate an invite link.
              </p>
              <form onSubmit={handleSetEmail} className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="owner@business.com"
                  required
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
                />
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                >
                  {emailSaving ? 'Setting…' : 'Set Email'}
                </button>
              </form>
              {emailError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
              {emailInviteLink && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Account created — share this invite link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailInviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(emailInviteLink!); toast('Invite link copied'); }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Subscription */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Subscription Details</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className={dtClass}>Recurring Price</dt>
              <dd className={ddClass}>₹{business.pricingAmount.toLocaleString('en-IN')}/{business.billingCycle === 'monthly' ? 'month' : 'year'}</dd>
            </div>
            <div>
              <dt className={dtClass}>Setup / Dev Fee</dt>
              <dd className={ddClass}>
                {business.setupFee ? `₹${business.setupFee.toLocaleString('en-IN')} (one-time)` : '—'}
              </dd>
            </div>
            <div>
              <dt className={dtClass}>Free Trial</dt>
              <dd className={ddClass}>
                {business.freeTrialEnabled ? `Enabled (${business.trialDurationDays} days)` : 'Disabled'}
              </dd>
            </div>
            {business.razorpayPaymentLink && (
              <div className="sm:col-span-2">
                <dt className={`${dtClass} mb-2`}>Payment Link</dt>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={business.razorpayPaymentLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(business.razorpayPaymentLink!); toast('Payment link copied'); }}
                    className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
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
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Page Deployment</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className={dtClass}>Status</dt>
              <dd className="mt-1 text-sm font-medium">
                {business.pageStatus === 'deployed' ? (
                  <span className="text-green-600 dark:text-green-400">Deployed</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">Awaiting Deployment</span>
                )}
              </dd>
            </div>
            {business.pageVersion && (
              <div>
                <dt className={dtClass}>Version</dt>
                <dd className={`${ddClass} font-mono`}>{business.pageVersion}</dd>
              </div>
            )}
            {business.componentTagName && (
              <div className="sm:col-span-2">
                <dt className={dtClass}>Component Tag</dt>
                <dd className={`${ddClass} font-mono`}>{business.componentTagName}</dd>
              </div>
            )}
            {business.pageJsUrl && (
              <div className="sm:col-span-2">
                <dt className={dtClass}>CDN URL</dt>
                <dd className={`${ddClass} font-mono break-all`}>{business.pageJsUrl}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Payments */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Payment History</h2>
          {paymentsData?.payments && paymentsData.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                    <th className="py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paymentsData.payments.map((payment: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 text-sm text-gray-900 dark:text-gray-200">
                        {new Date(payment.created_at * 1000).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 text-sm text-gray-900 dark:text-gray-200">
                        ₹{(payment.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {paymentsData?.message || 'No payment history available'}
            </p>
          )}
        </div>

        {/* Internal Notes */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Internal Notes</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Visible only in the admin panel.</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add internal notes about this business..."
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6] resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={notesSaving}
            className="mt-3 px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            {notesSaving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>

        {business.referralBonusPending && !business.referralBonusSent && (
          <ReferralBonusCard slug={slug!} brokerName={business.brokerName ?? 'Broker'} />
        )}
        {business.referralBonusSent && business.referralBonusAmount && (
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Referral Bonus</h2>
            <p className="text-sm text-green-600 dark:text-green-400">
              ₹{business.referralBonusAmount.toLocaleString('en-IN')} paid to referring broker
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
