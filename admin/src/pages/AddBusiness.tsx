import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import BrokerCombobox from '../components/BrokerCombobox';

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function AddBusiness() {
  const navigate = useNavigate();
  const { data: brokers } = useSWR('/api/admin/brokers', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.brokers as { id: string; name: string; phone: string }[];
  });

  const [formData, setFormData] = useState({
    businessName: '',
    businessSlug: '',
    ownerEmail: '',
    pricingAmount: 999,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    setupFee: 0,
    brokerId: '',
    commissionPercent: 10,
    freeTrialEnabled: false,
    trialDurationDays: 7,
    firstBillingDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ paymentLink: string; inviteLink: string | null; setupFee: number } | null>(null);

  const handleSlugInput = (val: string) => {
    const formatted = val
      .toLowerCase()
      .replace(/[\s\-]/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, businessSlug: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = { ...formData };
      if (formData.firstBillingDate) {
        payload.startAt = Math.floor(new Date(formData.firstBillingDate).getTime() / 1000);
      }
      delete payload.firstBillingDate;
      if (!payload.brokerId) {
        delete payload.brokerId;
        delete payload.commissionPercent;
      }

      const res = await adminFetch('/api/admin/business', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create business');
      }

      const data = await res.json();
      setResult({ paymentLink: data.paymentLink, inviteLink: data.inviteLink ?? null, setupFee: formData.setupFee });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 space-y-5">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-300">Business Created</h2>
            {result.setupFee > 0 && (
              <p className="text-sm text-green-800 dark:text-green-400">
                First payment includes ₹{result.setupFee.toLocaleString('en-IN')} setup fee.
              </p>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.paymentLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(result.paymentLink)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {result.inviteLink && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portal Invite Link</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  Share this with the owner — they click it to set their password and log in.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={result.inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(result.inviteLink!)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/businesses')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
              >
                View All Businesses
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setFormData({
                    businessName: '',
                    businessSlug: '',
                    ownerEmail: '',
                    pricingAmount: 999,
                    billingCycle: 'monthly',
                    setupFee: 0,
                    brokerId: '',
                    commissionPercent: 10,
                    freeTrialEnabled: false,
                    trialDurationDays: 7,
                    firstBillingDate: '',
                  });
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
              >
                Add Another
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Business</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Create a new TapLab subscriber</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className={inputClass}
                required
                placeholder="Pizza Palace"
              />
            </div>

            <div>
              <label className={labelClass}>Slug <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(lowercase, underscores only)</span></label>
              <input
                type="text"
                value={formData.businessSlug}
                onChange={(e) => handleSlugInput(e.target.value)}
                className={inputClass}
                required
                pattern="^[a-z0-9_]+$"
                placeholder="pizza_palace"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Used in the page URL: taplab.in/<strong>{formData.businessSlug || 'slug'}</strong>
              </p>
            </div>

            <div>
              <label className={labelClass}>Owner Email <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                className={inputClass}
                placeholder="owner@business.com"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                If provided, creates a portal account and generates an invite link.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Pricing Amount (₹)</label>
                <input
                  type="number"
                  value={formData.pricingAmount}
                  onChange={(e) => setFormData({ ...formData, pricingAmount: parseInt(e.target.value) })}
                  className={inputClass}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className={labelClass}>Billing Cycle</label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                  className={inputClass}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Setup / Development Fee (₹){' '}
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional — one-time, charged with first payment)</span>
              </label>
              <input
                type="number"
                value={formData.setupFee}
                onChange={(e) => setFormData({ ...formData, setupFee: parseInt(e.target.value) || 0 })}
                className={inputClass}
                min="0"
                placeholder="0"
              />
              {formData.setupFee > 0 && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  First payment: ₹{(formData.setupFee + formData.pricingAmount).toLocaleString('en-IN')} (₹{formData.setupFee.toLocaleString('en-IN')} setup + ₹{formData.pricingAmount.toLocaleString('en-IN')} subscription). Subsequent payments: ₹{formData.pricingAmount.toLocaleString('en-IN')}.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Broker{' '}
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
              </label>
              <BrokerCombobox
                brokers={brokers ?? []}
                value={formData.brokerId}
                onChange={(id) => setFormData({ ...formData, brokerId: id })}
              />
            </div>

            {formData.brokerId && (
              <div>
                <label className={labelClass}>
                  Commission %{' '}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(applied on setup fee)</span>
                </label>
                <input
                  type="number"
                  value={formData.commissionPercent}
                  onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                  min="0"
                  max="100"
                  step="0.5"
                />
                {formData.setupFee > 0 && formData.commissionPercent > 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Broker commission: ₹{Math.round(formData.commissionPercent / 100 * formData.setupFee).toLocaleString('en-IN')} on ₹{formData.setupFee.toLocaleString('en-IN')} setup fee
                  </p>
                )}
                {formData.setupFee === 0 && (
                  <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                    No setup fee set — commission will be ₹0
                  </p>
                )}
              </div>
            )}

            <div>
              <label className={labelClass}>
                First billing date{' '}
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional — defaults to today)</span>
              </label>
              <input
                type="date"
                value={formData.firstBillingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, firstBillingDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                role="switch"
                aria-checked={formData.freeTrialEnabled}
                onClick={() => setFormData({ ...formData, freeTrialEnabled: !formData.freeTrialEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  formData.freeTrialEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  formData.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Enable Free Trial</span>
            </div>

            {formData.freeTrialEnabled && (
              <div>
                <label className={labelClass}>Trial Duration (days)</label>
                <input
                  type="number"
                  value={formData.trialDurationDays}
                  onChange={(e) => setFormData({ ...formData, trialDurationDays: parseInt(e.target.value) })}
                  className={inputClass}
                  min="1"
                />
              </div>
            )}

            {error && (
              <div className="text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Business'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/businesses')}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
