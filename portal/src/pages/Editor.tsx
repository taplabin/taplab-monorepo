import { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useToast } from '../components/Toast';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import MenuEditor from '../components/MenuEditor';
import PortfolioEditor from '../components/PortfolioEditor';
import BrochureEditor from '../components/BrochureEditor';
import { PageSkeleton } from '../components/Skeleton';

// Keys that get a dedicated visual editor
const STRUCTURED_KEYS = ['menu_data', 'portfolio_data', 'brochure_data'];

const STRUCTURED_LABEL: Record<string, string> = {
  menu_data: 'Menu',
  portfolio_data: 'Portfolio Projects',
  brochure_data: 'Services & Features',
};

function toLabel(key: string): string {
  return key
    .replace(/_data$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const structuredKey = keys.find((k) => STRUCTURED_KEYS.includes(k));

  const setField = (key: string, val: string) =>
    setContent((prev) => ({ ...prev, [key]: val }));

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Editor</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Edit your page content</p>
        </div>

        {/* ── Structured data editor ── */}
        {structuredKey && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {STRUCTURED_LABEL[structuredKey] ?? toLabel(structuredKey)}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Add, edit or remove items — changes save when you click Save below
              </p>
            </div>
            <div className="p-5">
              {structuredKey === 'menu_data' && (
                <MenuEditor
                  value={content[structuredKey] ?? '{}'}
                  onChange={(val) => setField(structuredKey, val)}
                />
              )}
              {structuredKey === 'portfolio_data' && (
                <PortfolioEditor
                  value={content[structuredKey] ?? '[]'}
                  onChange={(val) => setField(structuredKey, val)}
                />
              )}
              {structuredKey === 'brochure_data' && (
                <BrochureEditor
                  value={content[structuredKey] ?? '[]'}
                  onChange={(val) => setField(structuredKey, val)}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Save ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#2087e6] hover:bg-[#13204d] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

      </div>
    </Layout>
  );
}