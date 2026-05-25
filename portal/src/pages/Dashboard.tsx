import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../lib/firebase';
import { portalFetch } from '../lib/api';

interface BusinessData {
  slug: string;
  businessName: string;
  subscriptionStatus: 'active' | 'inactive';
  razorpayPaymentLink: string | null;
  content: Record<string, string>;
}

function toLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Dashboard() {
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageUrl = business ? `https://taplab.in/${business.slug}` : '';

  useEffect(() => {
    portalFetch('/api/portal/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBusiness(data);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await portalFetch(`/api/page/${business.slug}/content`, {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveMsg('Saved! Your page will update within 30 seconds.');
    } catch {
      setSaveMsg('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading your page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => signOut(auth)} className="mt-4 text-indigo-600 text-sm underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{business?.businessName}</h1>
            <p className="text-xs text-gray-500">TapLab Portal</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Subscription status */}
        <div className={`rounded-xl p-5 border ${
          business?.subscriptionStatus === 'active'
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Subscription</p>
              <p className={`text-lg font-semibold mt-0.5 ${
                business?.subscriptionStatus === 'active' ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {business?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
              </p>
              {business?.subscriptionStatus === 'inactive' && (
                <p className="text-xs text-yellow-600 mt-1">Your page is not visible until payment is complete.</p>
              )}
            </div>
            {business?.subscriptionStatus === 'inactive' && business.razorpayPaymentLink && (
              <a
                href={business.razorpayPaymentLink}
                target="_blank"
                rel="noreferrer"
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Subscribe Now
              </a>
            )}
          </div>
        </div>

        {/* Page link + QR code */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Your Page</p>
          <div className="flex gap-2 mb-5">
            <input
              type="text"
              value={pageUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700"
            />
            <button
              onClick={() => navigator.clipboard.writeText(pageUrl)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Copy
            </button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <QRCodeSVG value={pageUrl} size={160} />
            <button
              onClick={() => {
                const svg = document.querySelector('svg');
                if (!svg) return;
                const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${business?.slug}-qr.svg`;
                a.click();
              }}
              className="text-sm text-indigo-600 hover:underline"
            >
              Download QR Code
            </button>
          </div>
        </div>

        {/* Content editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Edit Page Content</p>
          <div className="space-y-4">
            {Object.keys(content).map((key) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {toLabel(key)}
                </label>
                <input
                  type="text"
                  value={content[key]}
                  onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          {saveMsg && (
            <p className={`text-sm mt-4 ${saveMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </main>
    </div>
  );
}
