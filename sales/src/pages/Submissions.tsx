import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import SubmitLead from './SubmitLead';
import SubmitReferral from './SubmitReferral';

type MainTab = 'clients' | 'brokers';
type LeadStatus = 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

export default function Submissions() {
  const [tab, setTab] = useState<MainTab>('clients');
  const [showForm, setShowForm] = useState(false);

  const { data: leads, mutate: mutateLeads } = useSWR('/api/broker/leads', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).leads as any[];
  });

  const { data: referrals, mutate: mutateReferrals } = useSWR('/api/broker/referrals', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).referrals as any[];
  });

  const tabBtn = (t: MainTab, label: string) => (
    <button
      onClick={() => { setTab(t); setShowForm(false); }}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Submissions</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Track all your submitted leads and referrals</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Submit
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {tabBtn('clients', 'Clients')}
          {tabBtn('brokers', 'Brokers')}
        </div>

        {showForm && tab === 'clients' && (
          <SubmitLead onSuccess={() => { setShowForm(false); mutateLeads(); }} onCancel={() => setShowForm(false)} />
        )}
        {showForm && tab === 'brokers' && (
          <SubmitReferral onSuccess={() => { setShowForm(false); mutateReferrals(); }} onCancel={() => setShowForm(false)} />
        )}

        {tab === 'clients' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {!leads ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[1, 2].map((i) => <div key={i} className="px-5 py-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" /></div>)}
              </div>
            ) : leads.length === 0 ? (
              <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No leads submitted yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads.map((lead: any) => (
                  <div key={lead.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.businessName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[lead.status as LeadStatus]}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      ₹{lead.pricingAmount?.toLocaleString('en-IN')}/{lead.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      {lead.setupFee > 0 ? ` + ₹${lead.setupFee.toLocaleString('en-IN')} setup` : ''}
                    </p>
                    {lead.status === 'rejected' && lead.rejectionReason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{lead.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'brokers' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {!referrals ? (
              <div className="px-5 py-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
            ) : referrals.length === 0 ? (
              <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No broker referrals yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {referrals.map((r: any) => (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.phone} · {r.email}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[r.status as LeadStatus] ?? STATUS_COLORS.pending}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
