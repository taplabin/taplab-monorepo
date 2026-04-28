import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

export default function AddBusiness() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: '',
    businessSlug: '',
    pricingAmount: 999,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    freeTrialEnabled: false,
    trialDurationDays: 7,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentLink, setPaymentLink] = useState('');

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
      const res = await adminFetch('/api/admin/business', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create business');
      }

      const data = await res.json();
      setPaymentLink(data.paymentLink);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentLink);
  };

  if (paymentLink) {
    return (
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-4">
                ✅ Business Created!
              </h2>
              <p className="text-sm text-green-700 mb-4">
                Share this payment link with the business owner:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Copy
                </button>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => navigate('/businesses')}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  View All Businesses
                </button>
                <button
                  onClick={() => {
                    setPaymentLink('');
                    setFormData({
                      businessName: '',
                      businessSlug: '',
                      pricingAmount: 999,
                      billingCycle: 'monthly',
                      freeTrialEnabled: false,
                      trialDurationDays: 7,
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add New Business</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug (lowercase, underscores only)
              </label>
              <input
                type="text"
                value={formData.businessSlug}
                onChange={(e) => handleSlugInput(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                pattern="^[a-z0-9_]+$"
              />
              <p className="mt-1 text-xs text-gray-500">
                Example: pizza_palace, coffee_house
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pricing Amount (₹)
              </label>
              <input
                type="number"
                value={formData.pricingAmount}
                onChange={(e) =>
                  setFormData({ ...formData, pricingAmount: parseInt(e.target.value) })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Billing Cycle
              </label>
              <select
                value={formData.billingCycle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingCycle: e.target.value as 'monthly' | 'yearly',
                  })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.freeTrialEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, freeTrialEnabled: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Enable Free Trial
              </label>
            </div>

            {formData.freeTrialEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trial Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.trialDurationDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trialDurationDays: parseInt(e.target.value),
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Business'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/businesses')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
