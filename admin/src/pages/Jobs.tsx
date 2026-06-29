import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

type JobStatus = 'queued' | 'claimed' | 'in_review' | 'approved' | 'publish_pending' | 'live';

interface Job {
  id: string;
  businessName: string;
  pageType: string | null;
  status: JobStatus;
  devName: string | null;
  claimedAt: { _seconds: number } | null;
  inReviewAt: { _seconds: number } | null;
  createdAt: { _seconds: number } | null;
}

const TABS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Queued', value: 'queued' },
  { label: 'Claimed', value: 'claimed' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Live', value: 'live' },
];

const STATUS_COLORS: Record<string, string> = {
  queued:          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  claimed:         'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  in_review:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  approved:        'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  publish_pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  live:            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

function timeAgo(seconds: number) {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function currentTimestamp(job: Job): number {
  return job.inReviewAt?._seconds ?? job.claimedAt?._seconds ?? job.createdAt?._seconds ?? 0;
}

export default function Jobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<JobStatus | 'all'>('in_review');

  const url = tab === 'all' ? '/api/admin/jobs' : `/api/admin/jobs?status=${tab}`;
  const { data, isLoading } = useSWR(url, async (u: string) => {
    const res = await adminFetch(u);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed');
    return json.jobs as Job[];
  });

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Jobs</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Pages in progress through the Dev Panel pipeline
          </p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value as JobStatus | 'all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No jobs with this status.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dev</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{job.businessName}</p>
                      <p className="text-xs text-gray-400">{job.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {job.devName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {currentTimestamp(job) > 0 ? timeAgo(currentTimestamp(job)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
