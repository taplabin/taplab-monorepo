import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6]';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function AddReferral() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/referrals', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Referral submitted successfully');
      navigate('/submissions');
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/submissions')} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Refer a Broker</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Know someone who would make a great TapLab sales partner?</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Full Name</label>
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Sharma" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@example.com" className={inputClass} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                {saving ? 'Submitting…' : 'Submit Referral'}
              </button>
              <button type="button" onClick={() => navigate('/submissions')} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
