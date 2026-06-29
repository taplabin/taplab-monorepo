import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { devFetch } from '../lib/api';

interface Job {
  id: string;
  businessName: string;
  pageType: string | null;
  status: string;
  materials: string[];
  createdAt: { _seconds: number } | null;
  claimedAt: { _seconds: number } | null;
}

function timeAgo(seconds: number) {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PageTypeBadge({ type }: { type: string | null }) {
  const colors: Record<string, string> = {
    menu: 'bg-orange-100 text-orange-700',
    portfolio: 'bg-blue-100 text-blue-700',
    brochure: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-600',
  };
  const label = type ?? 'unknown';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[label] ?? colors.other}`}>
      {label}
    </span>
  );
}

function JobRow({ job, isMine, onClaim, claiming }: {
  job: Job;
  isMine: boolean;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  const navigate = useNavigate();
  const ts = job.claimedAt?._seconds ?? job.createdAt?._seconds ?? 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{job.businessName}</p>
          <div className="flex items-center gap-2 mt-1">
            <PageTypeBadge type={job.pageType} />
            <span className="text-xs text-gray-400">
              {job.materials.length} material{job.materials.length !== 1 ? 's' : ''}
            </span>
            {ts > 0 && (
              <span className="text-xs text-gray-400">{timeAgo(ts)}</span>
            )}
          </div>
        </div>
      </div>
      {isMine ? (
        <button
          onClick={() => navigate(`/job/${job.id}`)}
          className="text-sm px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg font-medium hover:bg-violet-100 transition-colors"
        >
          Continue →
        </button>
      ) : (
        <button
          onClick={() => onClaim(job.id)}
          disabled={claiming}
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {claiming ? 'Claiming…' : 'Claim'}
        </button>
      )}
    </div>
  );
}

export default function Queue() {
  const navigate = useNavigate();
  const [queued, setQueued] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await devFetch('/dev/jobs');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setQueued(data.queued ?? []);
      setMine(data.mine ?? []);
    } catch {
      setError('Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleClaim(slug: string) {
    setClaimingId(slug);
    try {
      const res = await devFetch(`/dev/jobs/${slug}/claim`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Could not claim job');
        return;
      }
      navigate(`/job/${slug}`);
    } catch {
      alert('Network error — try again');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Jobs</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My jobs</h2>
              <div className="space-y-2">
                {mine.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isMine
                    onClaim={handleClaim}
                    claiming={claimingId === job.id}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Open queue</h2>
            {queued.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No open jobs right now.</p>
            ) : (
              <div className="space-y-2">
                {queued.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isMine={false}
                    onClaim={handleClaim}
                    claiming={claimingId === job.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
