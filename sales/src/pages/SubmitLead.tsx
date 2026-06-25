import { useState } from 'react';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6]';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function SubmitLead({ onSuccess, onCancel }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    businessName: '', businessSlug: '', ownerName: '', ownerPhone: '', ownerEmail: '',
    pricingAmount: 999, billingCycle: 'monthly' as 'monthly' | 'yearly',
    setupFee: 0, commissionPercent: 10, freeTrialEnabled: false, trialDurationDays: 7,
  });
  const [saving, setSaving] = useState(false);

  const handleSlug = (val: string) => setForm({ ...form, businessSlug: val.toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, '') });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/leads', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Lead submitted');
      onSuccess();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Client Lead</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business Name</label>
          <input required type="text" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Pizza Palace" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input required type="text" value={form.businessSlug} onChange={(e) => handleSlug(e.target.value)} placeholder="pizza_palace" className={inputClass} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">taplab.in/{form.businessSlug || 'slug'}</p>
        </div>
        <div>
          <label className={labelClass}>Owner Name</label>
          <input required type="text" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Owner Phone</label>
          <input required type="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Owner Email <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(optional)</span></label>
          <input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Pricing (₹/month or year)</label>
          <input required type="number" value={form.pricingAmount} onChange={(e) => setForm({ ...form, pricingAmount: parseInt(e.target.value) || 0 })} min="1" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Billing Cycle</label>
          <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as 'monthly' | 'yearly' })} className={inputClass}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Setup Fee (₹)</label>
          <input type="number" value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: parseInt(e.target.value) || 0 })} min="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Commission %</label>
          <input required type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" step="0.5" className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.freeTrialEnabled}
          onClick={() => setForm({ ...form, freeTrialEnabled: !form.freeTrialEnabled })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.freeTrialEnabled ? 'bg-[#2087e6]' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">Free Trial</span>
      </div>

      {form.freeTrialEnabled && (
        <div>
          <label className={labelClass}>Trial Duration (days)</label>
          <input type="number" value={form.trialDurationDays} onChange={(e) => setForm({ ...form, trialDurationDays: parseInt(e.target.value) || 7 })} min="1" className={inputClass} />
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Submitting…' : 'Submit Lead'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
