import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

type MainTab = 'unanswered' | 'answered';

const TAGS = ['All', 'Suggestion', 'Complaint', 'Question', 'Win'];
const STATUSES = ['open', 'under_review', 'implemented', 'wont_fix'];
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', under_review: 'Under Review', implemented: 'Implemented', wont_fix: "Won't Fix",
};
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  under_review: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  implemented: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  wont_fix: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};
const TAG_COLORS: Record<string, string> = {
  Suggestion: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  Complaint: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  Question: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  Win: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};

const UNANSWERED = ['open', 'under_review'];
const ANSWERED = ['implemented', 'wont_fix'];

export default function BrokerFeedback() {
  const toast = useToast();
  const [tab, setTab] = useState<MainTab>('unanswered');
  const [tagFilter, setTagFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data, error, mutate } = useSWR('/api/admin/broker-feedback', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to fetch feedback');
    return json.feedback as any[];
  });

  const byTab = useMemo(() => {
    if (!data) return null;
    const statuses = tab === 'unanswered' ? UNANSWERED : ANSWERED;
    const inTab = data.filter((f: any) => statuses.includes(f.status));
    return tagFilter === 'All' ? inTab : inTab.filter((f: any) => f.tag === tagFilter);
  }, [data, tab, tagFilter]);

  const unansweredCount = useMemo(() => data?.filter((f: any) => UNANSWERED.includes(f.status)).length ?? 0, [data]);
  const answeredCount = useMemo(() => data?.filter((f: any) => ANSWERED.includes(f.status)).length ?? 0, [data]);

  const update = async (id: string, updates: object) => {
    setSaving(id);
    try {
      const res = await adminFetch(`/api/admin/broker-feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Broker Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Suggestions, complaints, and wins from the sales team</p>
        </div>

        {/* Unanswered / Answered tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['unanswered', 'answered'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setExpandedId(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'unanswered' ? 'Unanswered' : 'Answered'}
              {data && (
                <span className="ml-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                  {t === 'unanswered' ? unansweredCount : answeredCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="flex gap-2 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tagFilter === t ? 'bg-[#2087e6] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {!byTab && !error ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)
          ) : error ? (
            <p className="text-sm text-red-500 dark:text-red-400 py-8 text-center">Failed to load feedback — try refreshing.</p>
          ) : (byTab ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No {tab} feedback yet.</p>
          ) : (byTab ?? []).map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[item.tag] ?? ''}`}>{item.tag}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.brokerName}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      {item.upvotes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      {item.downvotes}
                    </span>
                    <span className={`text-xs font-medium ${item.upvotes - item.downvotes > 0 ? 'text-[#2087e6]' : item.upvotes - item.downvotes < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      Net {item.upvotes - item.downvotes > 0 ? '+' : ''}{item.upvotes - item.downvotes}
                    </span>
                  </div>
                  {item.adminReply && (
                    <div className="mt-3 pl-3 border-l-2 border-[#2087e6]/40 dark:border-blue-700">
                      <p className="text-xs text-[#2087e6] dark:text-blue-400">{item.adminReply}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="text-xs text-[#2087e6] dark:text-blue-400 hover:underline flex-shrink-0"
                >
                  {expandedId === item.id ? 'Close' : 'Manage'}
                </button>
              </div>

              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <div className="flex gap-2 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => update(item.id, { status: s })}
                          disabled={saving === item.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            item.status === s ? 'bg-[#2087e6] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reply</label>
                    <textarea
                      value={replyDraft[item.id] ?? item.adminReply ?? ''}
                      onChange={(e) => setReplyDraft({ ...replyDraft, [item.id]: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
                      placeholder="Write a reply visible to all brokers…"
                    />
                    <button
                      onClick={() => update(item.id, { adminReply: replyDraft[item.id] ?? item.adminReply ?? '' })}
                      disabled={saving === item.id}
                      className="mt-1.5 px-4 py-1.5 bg-[#2087e6] hover:bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {saving === item.id ? 'Saving…' : 'Save Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
