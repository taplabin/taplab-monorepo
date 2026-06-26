import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

const TAGS = ['Suggestion', 'Complaint', 'Question', 'Win'] as const;
type Tag = typeof TAGS[number];
type MainTab = 'unanswered' | 'answered';

const UNANSWERED_STATUSES = ['open', 'under_review'];
const ANSWERED_STATUSES = ['implemented', 'wont_fix'];

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

const STOP_WORDS = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'been', 'when', 'they', 'their', 'what', 'your', 'about', 'more', 'also', 'some', 'than', 'then', 'into', 'would', 'could', 'should', 'there', 'which', 'these', 'those']);

function getSimilar(input: string, allItems: any[]): any[] {
  if (!input || input.length < 25) return [];
  const words = input.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  if (words.length < 2) return [];
  return allItems.filter(item => {
    const itemWords = item.content.toLowerCase().split(/\W+/);
    const matches = words.filter(w => itemWords.some((iw: string) => iw.includes(w) || w.includes(iw)));
    return matches.length >= 2;
  });
}

export default function Feedback() {
  const toast = useToast();
  const [tab, setTab] = useState<MainTab>('unanswered');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ content: '', tag: 'Suggestion' as Tag });
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1 | null>>({});

  const { data, mutate } = useSWR('/api/broker/feedback', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).feedback as any[];
  });

  const unanswered = useMemo(() => data?.filter((f: any) => UNANSWERED_STATUSES.includes(f.status)) ?? [], [data]);
  const answered = useMemo(() => data?.filter((f: any) => ANSWERED_STATUSES.includes(f.status)) ?? [], [data]);
  const similar = useMemo(() => getSimilar(form.content, data ?? []), [form.content, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (similar.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    setConfirming(false);
    try {
      const res = await brokerFetch('/api/broker/feedback', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
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

  const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6]';

  const items = tab === 'unanswered' ? unanswered : answered;

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">One submission per week. Vote on what matters most.</p>
          </div>
          {!showForm && tab === 'unanswered' && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['unanswered', 'answered'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowForm(false); setConfirming(false); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'unanswered' ? 'Unanswered' : 'Answered'}
              {data && (
                <span className="ml-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                  {t === 'unanswered' ? unanswered.length : answered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submit form */}
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
                      form.tag === t ? 'bg-[#2087e6] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
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
                onChange={(e) => { setForm(f => ({ ...f, content: e.target.value.slice(0, 1000) })); setConfirming(false); }}
                rows={4}
                placeholder="Be specific and constructive. This goes to TapLab leadership."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Similar feedback warning */}
            {similar.length > 0 && (
              <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 p-3 space-y-2">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400">Similar feedback already exists:</p>
                <ul className="space-y-1.5">
                  {similar.slice(0, 3).map((s: any) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${STATUS_COLORS[s.status]}`}>
                        {STATUS_LABELS[s.status]}
                      </span>
                      <p className="text-xs text-yellow-800 dark:text-yellow-300 line-clamp-2">{s.content}</p>
                    </li>
                  ))}
                </ul>
                {confirming && (
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 pt-1">
                    Are you sure? Similar feedback exists above. Click Submit again to confirm.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting…' : confirming ? 'Submit anyway' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setConfirming(false); setForm({ content: '', tag: 'Suggestion' }); }}
                className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Feedback list */}
        <div className="space-y-3">
          {!data ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : items.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tab === 'unanswered' ? 'No open feedback yet. Be the first to submit.' : 'No answered feedback yet.'}
              </p>
            </div>
          ) : items.map((item: any) => {
            const myVote = myVotes[item.id] ?? null;
            const isAnswered = ANSWERED_STATUSES.includes(item.status);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[item.tag as Tag] ?? ''}`}>{item.tag}</span>
                      <span className={`text-[10px] font-medium ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{item.brokerName}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{item.content}</p>
                    <div className={`flex items-center gap-3 mt-2 ${isAnswered ? 'opacity-40 pointer-events-none' : ''}`}>
                      <button
                        onClick={() => handleVote(item.id, 1)}
                        disabled={votingId === item.id}
                        className={`flex items-center gap-1 text-xs transition-colors ${myVote === 1 ? 'text-[#2087e6]' : 'text-gray-400 dark:text-gray-500 hover:text-[#2087e6]'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                        {item.upvotes}
                      </button>
                      <button
                        onClick={() => handleVote(item.id, -1)}
                        disabled={votingId === item.id}
                        className={`flex items-center gap-1 text-xs transition-colors ${myVote === -1 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-red-500'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {item.downvotes}
                      </button>
                      {(() => { const net = item.upvotes - item.downvotes; return (
                        <span className={`text-xs font-medium ${net > 0 ? 'text-[#2087e6]' : net < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          Net {net > 0 ? '+' : ''}{net}
                        </span>
                      ); })()}
                    </div>
                    {item.adminReply && (
                      <div className="mt-3 pl-3 border-l-2 border-[#2087e6]/40 dark:border-blue-700">
                        <p className="text-xs font-semibold text-[#2087e6] dark:text-blue-400 mb-0.5">TapLab</p>
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
