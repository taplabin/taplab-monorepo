import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import BrokerCombobox from '../components/BrokerCombobox';
import { useToast } from '../components/Toast';

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6] focus:border-transparent text-sm transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

const DEFAULT_FORM = {
  businessName: '',
  businessSlug: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  pricingAmount: 999,
  billingCycle: 'monthly' as 'monthly' | 'yearly',
  setupFee: 0,
  brokerId: '',
  commissionPercent: 10,
  freeTrialEnabled: false,
  trialDurationDays: 7,
  firstBillingDate: '',
};

export default function AddBusiness() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const leadId = searchParams.get('leadId');

  const { data: brokers } = useSWR('/api/admin/brokers', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.brokers as { id: string; name: string; phone: string }[];
  });

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [leadData, setLeadData] = useState<any>(null);
  const [loadingLead, setLoadingLead] = useState(!!leadId);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ paymentLink: string; inviteLink: string | null; setupFee: number } | null>(null);

  useEffect(() => {
    if (!leadId) return;
    setLoadingLead(true);
    adminFetch(`/api/admin/leads/${leadId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.businessName) {
          setLeadData(data);
          setFormData((f) => ({
            ...f,
            businessName: data.businessName ?? '',
            businessSlug: data.businessSlug ?? '',
            ownerName: data.ownerName ?? '',
            ownerPhone: data.ownerPhone ?? '',
            ownerEmail: data.ownerEmail ?? '',
            pricingAmount: data.pricingAmount ?? 999,
            billingCycle: data.billingCycle ?? 'monthly',
            setupFee: data.setupFee ?? 0,
            commissionPercent: data.commissionPercent ?? 10,
            freeTrialEnabled: data.freeTrialEnabled ?? false,
            trialDurationDays: data.trialDurationDays ?? 7,
          }));
        }
      })
      .catch(() => toast('Could not load lead data', 'error'))
      .finally(() => setLoadingLead(false));
  }, [leadId]);

  const handleSlugInput = (val: string) => {
    const formatted = val.toLowerCase().replace(/[\s\-]/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, businessSlug: formatted });
  };

  const handleSaveAsDraft = async () => {
    setDraftLoading(true);
    setError('');
    try {
      const payload = {
        businessName: formData.businessName,
        businessSlug: formData.businessSlug,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail,
        pricingAmount: formData.pricingAmount,
        billingCycle: formData.billingCycle,
        setupFee: formData.setupFee,
        commissionPercent: formData.commissionPercent,
        freeTrialEnabled: formData.freeTrialEnabled,
        trialDurationDays: formData.trialDurationDays,
      };
      const res = await adminFetch('/api/admin/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save draft');
      toast('Saved as draft');
      navigate('/leads');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data: { paymentLink: string; inviteLink?: string };

      if (leadId) {
        await adminFetch(`/api/admin/leads/${leadId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            businessName: formData.businessName,
            businessSlug: formData.businessSlug,
            ownerName: formData.ownerName,
            ownerPhone: formData.ownerPhone,
            ownerEmail: formData.ownerEmail,
            pricingAmount: formData.pricingAmount,
            billingCycle: formData.billingCycle,
            setupFee: formData.setupFee,
            commissionPercent: formData.commissionPercent,
            freeTrialEnabled: formData.freeTrialEnabled,
            trialDurationDays: formData.trialDurationDays,
          }),
        });
        const approveRes = await adminFetch(`/api/admin/leads/${leadId}/approve`, { method: 'POST' });
        const approveData = await approveRes.json();
        if (!approveRes.ok) throw new Error(approveData.error || 'Failed to approve lead');
        data = approveData;
      } else {
        const payload: any = { ...formData };
        if (formData.firstBillingDate) {
          payload.startAt = Math.floor(new Date(formData.firstBillingDate).getTime() / 1000);
        }
        delete payload.firstBillingDate;
        if (!payload.brokerId) { delete payload.brokerId; delete payload.commissionPercent; }
        const res = await adminFetch('/api/admin/business', { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create business');
        data = await res.json();
      }

      setResult({ paymentLink: data.paymentLink, inviteLink: data.inviteLink ?? null, setupFee: formData.setupFee });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!leadId) return;
    const reason = window.prompt('Reason for rejection?');
    if (!reason?.trim()) return;
    try {
      const res = await adminFetch(`/api/admin/leads/${leadId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Lead rejected');
      navigate('/leads');
    } catch (err: any) {
      toast(err.message || 'Failed to reject', 'error');
    }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-3xl">
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
                <input type="text" value={result.paymentLink} readOnly className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" />
                <button onClick={() => navigator.clipboard.writeText(result.paymentLink)} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">Copy</button>
              </div>
            </div>
            {result.inviteLink && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portal Invite Link</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Share this with the owner — they click it to set their password and log in.</p>
                <div className="flex gap-2">
                  <input type="text" value={result.inviteLink} readOnly className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" />
                  <button onClick={() => navigator.clipboard.writeText(result.inviteLink!)} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">Copy</button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/businesses')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
                View All Businesses
              </button>
              {!leadId && (
                <button onClick={() => { setResult(null); setFormData(DEFAULT_FORM); }} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">
                  Add Another
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingLead) {
    return (
      <Layout>
        <div className="max-w-3xl animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to={leadId ? '/leads' : '/businesses'} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {leadId ? 'Review Lead' : 'Add New Business'}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {leadId
                ? leadData ? `Submitted by ${leadData.brokerName}` : 'Lead details'
                : 'Create a new TapLab subscriber'}
            </p>
          </div>
        </div>

        {leadId && leadData && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-sm text-[#2087e6] dark:text-blue-400 font-medium">Lead pre-filled — review and approve, or edit details first</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={labelClass}>Business Name</label>
                <input type="text" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} className={inputClass} required placeholder="Pizza Palace" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Slug <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(lowercase, underscores only)</span></label>
                <input type="text" value={formData.businessSlug} onChange={(e) => handleSlugInput(e.target.value)} className={inputClass} required pattern="^[a-z0-9_]+$" placeholder="pizza_palace" />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">taplab.in/<strong>{formData.businessSlug || 'slug'}</strong></p>
              </div>
              <div>
                <label className={labelClass}>Owner Name</label>
                <input type="text" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className={inputClass} placeholder="Rajesh Kumar" />
              </div>
              <div>
                <label className={labelClass}>Owner Phone</label>
                <input type="tel" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} className={inputClass} placeholder="+91 98765 43210" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Owner Email <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                <input type="email" value={formData.ownerEmail} onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })} className={inputClass} placeholder="owner@business.com" />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">If provided, creates a portal account and generates an invite link.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className={labelClass}>Pricing Amount (₹)</label>
                <input type="number" value={formData.pricingAmount} onChange={(e) => setFormData({ ...formData, pricingAmount: parseInt(e.target.value) })} className={inputClass} required min="1" />
              </div>
              <div>
                <label className={labelClass}>Billing Cycle</label>
                <select value={formData.billingCycle} onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })} className={inputClass}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Setup / Development Fee (₹) <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                <input type="number" value={formData.setupFee} onChange={(e) => setFormData({ ...formData, setupFee: parseInt(e.target.value) || 0 })} className={inputClass} min="0" placeholder="0" />
                {formData.setupFee > 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    First payment: ₹{(formData.setupFee + formData.pricingAmount).toLocaleString('en-IN')} (₹{formData.setupFee.toLocaleString('en-IN')} setup + ₹{formData.pricingAmount.toLocaleString('en-IN')} subscription)
                  </p>
                )}
              </div>
            </div>

            {!leadId && (
              <div>
                <label className={labelClass}>Broker <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                <BrokerCombobox brokers={brokers ?? []} value={formData.brokerId} onChange={(id) => setFormData({ ...formData, brokerId: id })} />
              </div>
            )}

            {(formData.brokerId || leadId) && (
              <div>
                <label className={labelClass}>Commission % <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(applied on setup fee)</span></label>
                <input type="number" value={formData.commissionPercent} onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })} className={inputClass} min="0" max="100" step="0.5" />
              </div>
            )}

            {!leadId && (
              <div>
                <label className={labelClass}>First billing date <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional — defaults to today)</span></label>
                <input type="date" value={formData.firstBillingDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, firstBillingDate: e.target.value })} className={inputClass} />
              </div>
            )}

            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                role="switch"
                aria-checked={formData.freeTrialEnabled}
                onClick={() => setFormData({ ...formData, freeTrialEnabled: !formData.freeTrialEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.freeTrialEnabled ? 'bg-[#2087e6]' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Enable Free Trial</span>
            </div>

            {formData.freeTrialEnabled && (
              <div>
                <label className={labelClass}>Trial Duration (days)</label>
                <input type="number" value={formData.trialDurationDays} onChange={(e) => setFormData({ ...formData, trialDurationDays: parseInt(e.target.value) })} className={inputClass} min="1" />
              </div>
            )}

            {error && (
              <div className="text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="flex-1 bg-[#2087e6] hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? (leadId ? 'Approving…' : 'Creating…') : (leadId ? 'Approve & Create Business' : 'Create Business')}
              </button>
              {!leadId && (
                <button type="button" onClick={handleSaveAsDraft} disabled={draftLoading || !formData.businessName} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                  {draftLoading ? 'Saving…' : 'Save as Draft'}
                </button>
              )}
              {leadId && (
                <button type="button" onClick={handleReject} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                  Reject
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
