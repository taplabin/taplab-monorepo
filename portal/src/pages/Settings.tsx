import { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useBusiness } from '../context/BusinessContext';
import Layout from '../components/Layout';

export default function Settings() {
  const { business, loading, error } = useBusiness();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');

    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwMsg('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwError('Current password is incorrect.');
      } else {
        setPwError(err.message || 'Failed to update password.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (error || !business) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-red-500 text-sm">{error || 'Failed to load business data.'}</p>
        </div>
      </Layout>
    );
  }

  const email = auth.currentUser?.email ?? '—';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Account and page settings</p>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</p>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">Business name</p>
            <p className="text-sm font-medium text-gray-800">{business.businessName}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">Business slug</p>
            <p className="text-sm font-mono text-gray-700">{business.slug}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-800">{email}</p>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Change Password</p>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Page link */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Page</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`https://taplab.in/${business.slug}`}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`https://taplab.in/${business.slug}`)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Sign out — shown only on mobile (sidebar handles this on desktop) */}
        <div className="md:hidden bg-white rounded-xl border border-gray-200 p-5">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
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
