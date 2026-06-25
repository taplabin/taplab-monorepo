import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2087e6] focus:border-transparent text-sm transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

interface ReferralData {
  name: string;
  phone: string;
  email: string;
  referringBrokerId: string;
}

export default function AddBroker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const referralId = searchParams.get('referralId');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    bankAccountNumber: '',
    bankIfsc: '',
    upiId: '',
    referredBy: '',
  });
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(!!referralId);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; inviteLink: string } | null>(null);

  useEffect(() => {
    if (!referralId) return;
    setLoadingReferral(true);
    adminFetch(`/api/admin/broker-referrals/${referralId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.referral) {
          const r: ReferralData = data.referral;
          setReferral(r);
          setForm((f) => ({ ...f, name: r.name, phone: r.phone, email: r.email }));
        }
      })
      .catch(() => toast('Could not load referral data', 'error'))
      .finally(() => setLoadingReferral(false));
  }, [referralId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data: { inviteLink: string };

      if (referralId) {
        const res = await adminFetch(`/api/admin/broker-referrals/${referralId}/approve`, {
          method: 'POST',
          body: JSON.stringify({
            bankAccountNumber: form.bankAccountNumber,
            bankIfsc: form.bankIfsc,
            upiId: form.upiId,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to approve referral');
        data = json;
      } else {
        const res = await adminFetch('/api/admin/brokers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create broker');
        data = json;
      }

      setResult({ name: form.name, inviteLink: data.inviteLink });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!referralId) return;
    const reason = window.prompt('Reason for rejection?');
    if (!reason?.trim()) return;
    try {
      const res = await adminFetch(`/api/admin/broker-referrals/${referralId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Referral rejected');
      navigate('/broker-referrals');
    } catch (err: any) {
      toast(err.message || 'Failed to reject', 'error');
    }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-3xl">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 space-y-5">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-300">
              {referralId ? 'Referral Approved' : 'Broker Created'}
            </h2>
            <p className="text-sm text-green-800 dark:text-green-400">{result.name} has been added as a broker.</p>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invite Link</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Share this with the broker — they click it to set their password and log in.</p>
              <div className="flex gap-2">
                <input type="text" value={result.inviteLink} readOnly className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" />
                <button onClick={() => { navigator.clipboard.writeText(result.inviteLink); toast('Copied'); }} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">Copy</button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/brokers')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
                View All Brokers
              </button>
              {!referralId && (
                <button onClick={() => { setResult(null); setForm({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' }); }} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white rounded-lg text-sm transition-colors">
                  Add Another
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingReferral) {
    return (
      <Layout>
        <div className="max-w-3xl animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to={referralId ? '/broker-referrals' : '/brokers'} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {referralId ? 'Review Referral' : 'Add New Broker'}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {referralId
                ? referral ? `Referred by broker · ${referral.name}` : 'Loading referral…'
                : 'Add a new broker to your sales network'}
            </p>
          </div>
        </div>

        {referralId && referral && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-sm text-[#2087e6] dark:text-blue-400 font-medium">Broker referral — details pre-filled from submission</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required placeholder="Rahul Sharma" />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} required placeholder="+91 98765 43210" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional — used for portal invite)</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="rahul@example.com" />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Bank Details <span className="text-xs text-gray-400 font-normal">(optional — can be added later)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input type="text" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className={inputClass} placeholder="123456789" />
                </div>
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input type="text" value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })} className={inputClass} placeholder="SBIN0001234" />
                </div>
                <div>
                  <label className={labelClass}>UPI ID</label>
                  <input type="text" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} className={inputClass} placeholder="name@upi" />
                </div>
                {!referralId && (
                  <div>
                    <label className={labelClass}>Referred By <span className="text-xs text-gray-400 font-normal">(broker name, optional)</span></label>
                    <input type="text" value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} className={inputClass} placeholder="Existing broker name" />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="flex-1 bg-[#2087e6] hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? (referralId ? 'Approving…' : 'Creating…') : (referralId ? 'Approve & Create Broker' : 'Create Broker')}
              </button>
              {referralId ? (
                <button type="button" onClick={handleReject} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                  Reject
                </button>
              ) : (
                <button type="button" onClick={() => navigate('/brokers')} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
