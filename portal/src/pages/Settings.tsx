import { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useBusiness } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import Layout from '../components/Layout';
import { PageSkeleton } from '../components/Skeleton';

export default function Settings() {
  const { business, loading, error } = useBusiness();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPw.length < 6) {
      toast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      toast('Passwords do not match.', 'error');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      toast('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast('Current password is incorrect.', 'error');
      } else {
        toast(err.message || 'Failed to update password.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><PageSkeleton /></Layout>;

  if (error || !business) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500 dark:text-red-400 text-sm">{error || 'Failed to load business data.'}</p>
        </div>
      </Layout>
    );
  }

  const email = auth.currentUser?.email ?? '—';
  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Account and preferences</p>
        </div>

        {/* Account info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</p>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Business name</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{business.businessName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Page slug</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{business.slug}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{email}</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Appearance</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark mode</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Change Password</p>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Current password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm new password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Sign out — mobile only */}
        <div className="md:hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>

      </div>
    </Layout>
  );
}
