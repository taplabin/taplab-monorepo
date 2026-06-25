import { useState } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

type ReferralStatus = 'pending' | 'converted' | 'rejected';

interface BrokerReferral {
  id: string;
  referringBrokerId: string;
  name: string;
  phone: string;
  email: string;
  status: ReferralStatus;
  rejectionReason?: string;
  createdAt: { seconds: number };
}

interface Broker {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<ReferralStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  converted: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

function ApproveForm({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState({ bankAccountNumber: '', bankIfsc: '', upiId: '' });
  const [result, setResult] = useState<{ inviteLink: string } | null>(null);

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/broker-referrals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(bank),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ inviteLink: data.inviteLink });
      toast('Referral approved — broker created');
    } catch (err: any) {
      toast(err.message || 'Failed to approve', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
        <p className="text-xs text-green-700 dark:text-green-400 font-medium">Broker created. Share invite link:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={result.inviteLink}
            readOnly
            className="flex-1 px-2 py-1.5 text-xs border border-green-200 dark:border-green-800 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          />
          <button
            onClick={() => { navigator.clipboard.writeText(result.inviteLink); toast('Copied'); }}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
          >
            Copy
          </button>
        </div>
        <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Done</button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Bank details (optional — can add later)</p>
      {[
        { key: 'bankAccountNumber', label: 'Account number', placeholder: '123456789' },
        { key: 'bankIfsc', label: 'IFSC', placeholder: 'SBIN0001234' },
        { key: 'upiId', label: 'UPI ID', placeholder: 'name@upi' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</label>
          <input
            type="text"
            value={(bank as any)[key]}
            onChange={(e) => setBank((prev) => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            className="mt-0.5 w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={saving}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating broker…' : 'Confirm Approve'}
        </button>
        <button onClick={onDone} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RejectForm({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/broker-referrals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Referral rejected');
      onDone();
    } catch (err: any) {
      toast(err.message || 'Failed to reject', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg space-y-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for rejection…"
        className="w-full px-2 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={saving || !reason.trim()}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          {saving ? 'Rejecting…' : 'Confirm Reject'}
        </button>
        <button onClick={onDone} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function BrokerReferrals() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [expanding, setExpanding] = useState<string | null>(null);

  const { data: referrals, isLoading, mutate } = useSWR(
    `/api/admin/broker-referrals${tab === 'pending' ? '?status=pending' : ''}`,
    async (url: string) => {
      const res = await adminFetch(url);
      return (await res.json()).referrals as BrokerReferral[];
    }
  );

  const { data: brokers } = useSWR('/api/admin/brokers', async (url: string) => {
    const res = await adminFetch(url);
    return (await res.json()).brokers as Broker[];
  });

  const brokerMap = new Map<string, string>(brokers?.map((b): [string, string] => [b.id, b.name]) ?? []);

  const handleDone = () => {
    setExpanding(null);
    mutate();
  };

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Broker Referrals</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Broker-to-broker referrals submitted through the sales portal</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!referrals || referrals.length === 0) && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No {tab === 'pending' ? 'pending' : ''} referrals.
              </p>
            </div>
          )}

          {!isLoading && referrals && referrals.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referrals.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[r.status]}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.phone} · {r.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Referred by {brokerMap.get(r.referringBrokerId) ?? r.referringBrokerId}
                      </p>
                      {r.status === 'rejected' && r.rejectionReason && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{r.rejectionReason}</p>
                      )}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpanding(expanding === `approve-${r.id}` ? null : `approve-${r.id}`)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setExpanding(expanding === `reject-${r.id}` ? null : `reject-${r.id}`)}
                          className="px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  {expanding === `approve-${r.id}` && (
                    <ApproveForm id={r.id} onDone={handleDone} />
                  )}
                  {expanding === `reject-${r.id}` && (
                    <RejectForm id={r.id} onDone={handleDone} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
