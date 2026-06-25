import { useState, useRef } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

export default function MyProfile() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ bio: string; city: string } | null>(null);

  const { data: profile, mutate } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<any>;
  }, {
    onSuccess: (data) => {
      if (!form) setForm({ bio: data.bio ?? '', city: data.city ?? '' });
    },
  });

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Profile updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
    setUploading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const token = await getAuth().currentUser!.getIdToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/broker/profile/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Photo updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6]';

  return (
    <Layout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Visible to other brokers on the team page and leaderboard</p>
        </div>

        {/* Photo */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
              {profile?.photoUrl ? (
                <img src={`${profile.photoUrl}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name ?? '…'}</p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-1 text-xs text-[#2087e6] dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>
        </div>

        {/* Bio + City */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
            <input
              type="text"
              value={form?.city ?? ''}
              onChange={(e) => setForm(f => f ? { ...f, city: e.target.value } : f)}
              placeholder="Mumbai"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bio <span className="text-gray-400 font-normal text-xs">({form?.bio?.length ?? 0}/300)</span>
            </label>
            <textarea
              value={form?.bio ?? ''}
              onChange={(e) => setForm(f => f ? { ...f, bio: e.target.value.slice(0, 300) } : f)}
              rows={3}
              placeholder="A short intro about yourself…"
              className={`${inputClass} resize-none`}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form}
            className="w-full py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Read-only info */}
        {profile && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Account Info</p>
            <dl className="space-y-2">
              {[
                { label: 'Email', value: profile.email },
                { label: 'Phone', value: profile.phone },
                { label: 'Bank Status', value: profile.bankVerified ? 'Verified ✓' : 'Pending' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Layout>
  );
}
