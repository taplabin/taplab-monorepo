import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

type SettingsTab = 'general' | 'streak';

interface Tier {
  fromDeal: number;
  bonusAmount: number;
}

const inputClass = 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6] w-full';

function StreakConfigTab() {
  const toast = useToast();
  const { data, mutate } = useSWR('/api/admin/config', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()) as { tiers: Tier[] };
  });

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setTiers(data.tiers);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ tiers }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Streak config saved');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Streak Configuration</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Configure bonus amounts for broker deal streaks</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
          <span>From deal #</span>
          <span>Bonus amount (₹)</span>
        </div>
        {tiers.map((tier, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={tier.fromDeal}
              onChange={(e) => {
                const next = [...tiers];
                next[i] = { ...next[i], fromDeal: parseInt(e.target.value) || 0 };
                setTiers(next);
              }}
              className={inputClass}
              min="1"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={tier.bonusAmount}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...next[i], bonusAmount: parseInt(e.target.value) || 0 };
                  setTiers(next);
                }}
                className={inputClass}
                min="0"
              />
              <button
                type="button"
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTiers([...tiers, { fromDeal: 0, bonusAmount: 0 }])}
          className="text-sm text-[#2087e6] dark:text-blue-400 hover:underline"
        >
          + Add tier
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Config'}
      </button>
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">General Settings</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Platform-wide configuration</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <p className="text-sm text-gray-400 dark:text-gray-500">No general settings configured yet.</p>
      </div>
    </div>
  );
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'streak', label: 'Streak Configuration' },
];

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>('streak');

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Platform configuration and preferences</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'general' && <GeneralTab />}
        {tab === 'streak' && <StreakConfigTab />}
      </div>
    </Layout>
  );
}
