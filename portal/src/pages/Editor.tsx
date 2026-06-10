import { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useToast } from '../components/Toast';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import MenuEditor from '../components/MenuEditor';
import { PageSkeleton } from '../components/Skeleton';

function toLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isJsonObject(val: string): boolean {
  try {
    const p = JSON.parse(val);
    return typeof p === 'object' && p !== null && !Array.isArray(p);
  } catch {
    return false;
  }
}

export default function Editor() {
  const { business, loading, error, refetch } = useBusiness();
  const toast = useToast();
  const [content, setContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) setContent(business.content);
  }, [business]);

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

  if (business.pageStatus === 'no_page') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Editor</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Edit your page content</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No page deployed yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
              Your page will be editable here once it has been deployed.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await portalFetch(`/api/page/${business.slug}/content`, {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      toast('Changes saved — page updates within 30 seconds');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Save failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const keys = business.contentKeys.length > 0 ? business.contentKeys : Object.keys(content);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Editor</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Edit your page content</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-6">
          {keys.map((key) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {toLabel(key)}
              </label>

              {key === 'menu_data' ? (
                <MenuEditor
                  value={content[key] ?? '{}'}
                  onChange={(val) => setContent((prev) => ({ ...prev, [key]: val }))}
                />
              ) : isJsonObject(content[key] ?? '') ? (
                <textarea
                  value={content[key] ?? ''}
                  onChange={(e) => setContent((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  value={content[key] ?? ''}
                  onChange={(e) => setContent((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </div>
    </Layout>
  );
}
