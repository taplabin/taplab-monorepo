import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface FeedbackItem {
  id: string;
  businessName: string;
  content: string;
  read: boolean;
  createdAt: { seconds: number } | null;
}

export default function CustomerFeedback() {
  const toast = useToast();

  const { data, error, mutate } = useSWR('/api/admin/customer-feedback', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to fetch feedback');
    return json.feedback as FeedbackItem[];
  });

  function formatDate(ts: any): string {
    if (!ts) return '—';
    const secs = ts.seconds ?? ts._seconds;
    if (!secs) return '—';
    return new Date(secs * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function toggleRead(item: FeedbackItem) {
    mutate(
      data?.map((f) => f.id === item.id ? { ...f, read: !f.read } : f),
      false
    );
    try {
      const res = await adminFetch(`/api/admin/customer-feedback/${item.id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
    } catch {
      mutate(data, false);
      toast('Failed to update', 'error');
    }
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Private feedback submitted by portal customers</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!data && !error ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))
          ) : error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">Failed to load — try refreshing.</p>
            </div>
          ) : data!.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No customer feedback yet.</p>
            </div>
          ) : data!.map((item) => (
            <div
              key={item.id}
              className={`px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-start gap-4 ${
                !item.read ? 'bg-blue-50/40 dark:bg-blue-500/10' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-[#2087e6] flex-shrink-0" />}
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.businessName}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.createdAt)}</p>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
              </div>
              <button
                onClick={() => toggleRead(item)}
                title={item.read ? 'Mark as unread' : 'Mark as read'}
                className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  item.read
                    ? 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500'
                    : 'text-[#2087e6] hover:text-[#2087e6] dark:text-blue-400 dark:hover:text-blue-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
