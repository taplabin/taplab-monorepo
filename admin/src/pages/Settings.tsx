import { useState, useEffect } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

type SettingsTab = 'general' | 'streak' | 'storage';

interface Tier { fromDeal: number; bonusAmount: number; }

const inputClass = 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6] w-full';

// ── Streak Config ────────────────────────────────────────────────────────────
function StreakConfigTab() {
  const toast = useToast();
  const { data, mutate } = useSWR('/api/admin/config', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()) as { tiers: Tier[] };
  });
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setTiers(data.tiers); }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/config', { method: 'PUT', body: JSON.stringify({ tiers }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Streak config saved');
      mutate();
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Streak Configuration</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Configure bonus amounts for broker deal streaks</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
          <span>From deal #</span><span>Bonus amount (₹)</span>
        </div>
        {!data ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-3 animate-pulse">
              <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))
        ) : (
          <>
            {tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input type="number" value={tier.fromDeal} onChange={(e) => { const n = [...tiers]; n[i] = { ...n[i], fromDeal: parseInt(e.target.value) || 0 }; setTiers(n); }} className={inputClass} min="1" />
                <div className="flex gap-2">
                  <input type="number" value={tier.bonusAmount} onChange={(e) => { const n = [...tiers]; n[i] = { ...n[i], bonusAmount: parseInt(e.target.value) || 0 }; setTiers(n); }} className={inputClass} min="0" />
                  <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setTiers([...tiers, { fromDeal: 0, bonusAmount: 0 }])} className="text-sm text-[#2087e6] dark:text-blue-400 hover:underline">+ Add tier</button>
          </>
        )}
      </div>
      <button onClick={handleSave} disabled={saving || !data} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : 'Save Config'}
      </button>
    </div>
  );
}

// ── Storage Scanner ──────────────────────────────────────────────────────────
interface ScanResult { totalFiles: number; activeCount: number; orphanCount: number; orphans: string[]; }
type ScanState = { phase: 'idle' } | { phase: 'scanning' } | { phase: 'scanned'; result: ScanResult } | { phase: 'deleting'; result: ScanResult } | { phase: 'done'; deleted: number } | { phase: 'error'; message: string };

function StorageTab() {
  const toast = useToast();
  const [state, setState] = useState<ScanState>({ phase: 'idle' });

  async function handleScan() {
    setState({ phase: 'scanning' });
    try {
      const res = await adminFetch('/api/admin/storage/orphans');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setState({ phase: 'scanned', result: data });
    } catch (err: any) { setState({ phase: 'error', message: err.message }); }
  }

  async function handleDelete(result: ScanResult) {
    setState({ phase: 'deleting', result });
    try {
      const res = await adminFetch('/api/admin/storage/orphans', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setState({ phase: 'done', deleted: data.deleted });
      toast(`Deleted ${data.deleted} orphaned file${data.deleted !== 1 ? 's' : ''}`);
    } catch (err: any) { setState({ phase: 'error', message: err.message }); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Storage Scanner</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Clean up orphaned page bundles from the R2 bucket</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 leading-relaxed">
          Every time a page is rebuilt, Vite generates a new hashed filename. Old versions stay in the bucket unused. This tool scans the bucket, compares against the current <code className="mx-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px]">pageVersion</code> of every business in Firestore, and deletes anything that doesn't match.
        </p>
        {state.phase === 'idle' && (
          <button onClick={handleScan} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">Scan bucket</button>
        )}
        {state.phase === 'scanning' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin flex-shrink-0" />
            Scanning R2 bucket and Firestore…
          </div>
        )}
        {(state.phase === 'scanned' || state.phase === 'deleting') && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total files', value: state.result.totalFiles },
                { label: 'Active', value: state.result.activeCount },
                { label: 'Orphaned', value: state.result.orphanCount, highlight: state.result.orphanCount > 0 },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
            {state.result.orphanCount === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Bucket is clean — no orphaned files found.</p>
            ) : (
              <>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Files to delete</p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                    {state.result.orphans.map((file) => (
                      <div key={file} className="px-4 py-2.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDelete(state.result)} disabled={state.phase === 'deleting'} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                    {state.phase === 'deleting' && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    {state.phase === 'deleting' ? 'Deleting…' : `Delete ${state.result.orphanCount} file${state.result.orphanCount !== 1 ? 's' : ''}`}
                  </button>
                  <button onClick={() => setState({ phase: 'idle' })} disabled={state.phase === 'deleting'} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors">Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
        {state.phase === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Done — deleted {state.deleted} file{state.deleted !== 1 ? 's' : ''}.</p>
            <button onClick={() => setState({ phase: 'idle' })} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">Scan again</button>
          </div>
        )}
        {state.phase === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
            <button onClick={() => setState({ phase: 'idle' })} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── General ──────────────────────────────────────────────────────────────────
function GeneralTab() {
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const pwInputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6]';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { toast('Passwords do not match', 'error'); return; }
    const user = auth.currentUser;
    if (!user?.email) return;
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      toast('Password updated');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast('Current password is incorrect', 'error');
      } else {
        toast(err.message || 'Failed to update password', 'error');
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Dark mode */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Currently {theme === 'dark' ? 'on' : 'off'}</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-[#2087e6]' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Reset password */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className={pwInputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} className={pwInputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className={pwInputClass} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors mt-1">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'streak', label: 'Streak Config' },
  { id: 'storage', label: 'Storage' },
];

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>('general');

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
        {tab === 'storage' && <StorageTab />}
      </div>
    </Layout>
  );
}
