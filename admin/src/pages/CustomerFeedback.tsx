import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

export default function CustomerFeedback() {
  const { data } = useSWR('/admin/customer-feedback', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()).feedback as any[];
  });

  function formatDate(ts: { seconds: number } | null): string {
    if (!ts) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Private feedback submitted by portal customers</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!data ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No customer feedback yet.</p></div>
          ) : data.map((item: any) => (
            <div key={item.id} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.businessName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.createdAt)}</p>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
