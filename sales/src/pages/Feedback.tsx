import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

const TAGS = ['Suggestion', 'Complaint', 'Question', 'Win'] as const;
type Tag = typeof TAGS[number];

const TAG_COLORS: Record<Tag, string> = {
  Suggestion: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  Complaint: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  Question: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  Win: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'text-gray-400 dark:text-gray-500',
  under_review: 'text-yellow-600 dark:text-yellow-400',
  implemented: 'text-green-600 dark:text-green-400',
  wont_fix: 'text-red-500 dark:text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', under_review: 'Under Review', implemented: 'Implemented', wont_fix: "Won't Fix",
};

export default function Feedback() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ content: '', tag: 'Suggestion' as Tag });
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1 | null>>({});

  const { data, mutate } = useSWR('/api/broker/feedback', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).feedback as any[];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await brokerFetch('/api/broker/feedback', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Feedback submitted');
      setShowForm(false);
      setForm({ content: '', tag: 'Suggestion' });
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string, vote: 1 | -1) => {
    setVotingId(id);
    const prev = myVotes[id] ?? null;
    setMyVotes(v => ({ ...v, [id]: prev === vote ? null : vote }));
    try {
      const res = await brokerFetch(`/api/broker/feedback/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      mutate();
    } catch (err: any) {
      setMyVotes(v => ({ ...v, [id]: prev }));
      toast(err.message || 'Failed to vote', 'error');
    } finally {
      setVotingId(null);
    }
  };

  const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">One submission per week. Upvote what matters most.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Submit
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Feedback</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tag: t }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.tag === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-gray-400 font-normal text-xs">({form.content.length}/1000)</span>
              </label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value.slice(0, 1000) }))}
                rows={4}
                placeholder="Be specific and constructive. This goes to TapLab leadership."
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {!data ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : data.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No feedback yet. Be the first to submit.</p>
            </div>
          ) : data.map((item: any) => {
            const myVote = myVotes[item.id] ?? null;
            return (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start gap-3">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                    <button
                      onClick={() => handleVote(item.id, 1)}
                      disabled={votingId === item.id}
                      className={`p-1 rounded transition-colors ${myVote === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l8 8H4l8-8z" />
                      </svg>
                    </button>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.upvotes - item.downvotes}</span>
                    <button
                      onClick={() => handleVote(item.id, -1)}
                      disabled={votingId === item.id}
                      className={`p-1 rounded transition-colors ${myVote === -1 ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 20l-8-8h16l-8 8z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[item.tag as Tag] ?? ''}`}>{item.tag}</span>
                      <span className={`text-[10px] font-medium ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{item.brokerName}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{item.content}</p>
                    {item.adminReply && (
                      <div className="mt-3 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700">
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">TapLab</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{item.adminReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
