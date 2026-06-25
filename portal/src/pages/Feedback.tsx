import { useState, useEffect, useCallback } from 'react';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface FeedbackItem {
  id: string;
  content: string;
  createdAt: { seconds: number } | null;
}

export default function Feedback() {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await portalFetch('/api/portal/feedback');
      const data = await res.json();
      if (res.ok) setHistory(data.feedback ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) { toast('Please write at least 10 characters', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await portalFetch('/api/portal/feedback', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Feedback sent — thank you!');
      setContent('');
      setSubmitted(true);
      loadHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  function formatDate(ts: { seconds: number } | null): string {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Share your thoughts directly with the TapLab team. All feedback is private.
          </p>
        </div>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your feedback</label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value.slice(0, 2000)); setSubmitted(false); }}
              rows={6}
              placeholder="What's working well? What could be better? Any feature requests?"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6] resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">{content.length}/2000 characters</span>
            <button
              type="submit"
              disabled={submitting || content.trim().length < 10}
              className="px-6 py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending…' : submitted ? 'Sent ✓' : 'Send Feedback'}
            </button>
          </div>
        </form>

        {/* Past submissions */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Your Previous Feedback</p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {history.map((item) => (
                <div key={item.id} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{item.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
