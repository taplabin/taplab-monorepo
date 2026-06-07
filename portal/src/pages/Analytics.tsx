import { useBusiness } from '../context/BusinessContext';
import Layout from '../components/Layout';
import { PageSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

export default function Analytics() {
  const { business, loading, error } = useBusiness();
  const toast = useToast();

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

  const pageUrl = `https://taplab.in/${business.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pageUrl);
    toast('Link copied to clipboard');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
        </div>

        {/* Main stat */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Page Views</p>
              <p className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                {business.pageViews.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Taps on your NFC tag and direct visits to your page
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              This is a rough estimate. Cloudflare CDN caches your page for 30 seconds, so rapid repeat visits may not be counted.
            </p>
          </div>
        </div>

        {/* Page status */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Page Status</p>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              business.pageStatus === 'deployed'
                ? 'bg-green-500'
                : 'bg-yellow-500'
            }`} />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {business.pageStatus === 'deployed' ? 'Live and accessible' : 'Not yet deployed'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pageUrl}</p>
            </div>
            {business.pageStatus === 'deployed' && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
              >
                Open →
              </a>
            )}
          </div>
        </div>

        {/* Share */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Share Your Page</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pageUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
}
