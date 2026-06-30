import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

interface Build {
  id: string;
  buildNumber: number;
  stagingUrl: string;
  stagingToken: string;
  devName: string;
  claudeModel: string;
  promptVersion: string;
  templateVersion: string;
  createdAt: { _seconds: number } | null;
}

interface Job {
  id: string;
  businessName: string;
  businessSlug: string;
  pageType: string | null;
  status: string;
  devName: string | null;
  approvedBuildId: string | null;
  materials: string[];
  materialsNotes: string | null;
  claimedAt: { _seconds: number } | null;
  inReviewAt: { _seconds: number } | null;
  approvedAt: { _seconds: number } | null;
  liveAt: { _seconds: number } | null;
  createdAt: { _seconds: number } | null;
  builds: Build[];
}

function timeStr(seconds: number) {
  return new Date(seconds * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_COLORS: Record<string, string> = {
  queued:          'bg-gray-100 text-gray-600',
  claimed:         'bg-blue-100 text-blue-700',
  in_review:       'bg-yellow-100 text-yellow-700',
  approved:        'bg-green-100 text-green-700',
  publish_pending: 'bg-orange-100 text-orange-700',
  live:            'bg-emerald-100 text-emerald-700',
};

const TIMELINE_STEPS = [
  { key: 'createdAt', label: 'Created (queued)' },
  { key: 'claimedAt', label: 'Claimed' },
  { key: 'inReviewAt', label: 'In review' },
  { key: 'approvedAt', label: 'Approved' },
  { key: 'liveAt', label: 'Live' },
];

export default function AdminJobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [materialUrls, setMaterialUrls] = useState('');
  const [materialNotes, setMaterialNotes] = useState('');
  const [addingMaterials, setAddingMaterials] = useState(false);
  const [selectedBuildId, setSelectedBuildId] = useState<string>('');
  const [approvingBuild, setApprovingBuild] = useState(false);
  const [approveResult, setApproveResult] = useState<{ paymentLink: string; inviteLink: string | null } | null>(null);
  const [approveError, setApproveError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [retryOk, setRetryOk] = useState(false);

  const { data: job, mutate, isLoading } = useSWR<Job>(
    slug ? `/api/admin/jobs/${slug}` : null,
    async (url: string) => {
      const res = await adminFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      return json as Job;
    }
  );

  // Pre-select latest build when data loads
  if (job && !selectedBuildId && job.builds.length > 0) {
    setSelectedBuildId(job.builds[0].id);
  }

  async function handleAddMaterials() {
    if (!slug || !materialUrls.trim()) return;
    setAddingMaterials(true);
    const urls = materialUrls.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const res = await adminFetch(`/api/admin/jobs/${slug}/add-materials`, {
        method: 'POST',
        body: JSON.stringify({ urls, notes: materialNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error ?? 'Failed to add materials');
        return;
      }
      setMaterialUrls('');
      setMaterialNotes('');
      mutate();
    } finally {
      setAddingMaterials(false);
    }
  }

  async function handleRetryPromotion() {
    if (!slug) return;
    setRetrying(true);
    setRetryError('');
    setRetryOk(false);
    try {
      const res = await adminFetch(`/api/admin/jobs/${slug}/retry-promotion`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        setRetryError(json.error ?? 'Retry failed');
        return;
      }
      setRetryOk(true);
      mutate();
    } finally {
      setRetrying(false);
    }
  }

  async function handleApproveBuild() {
    if (!slug || !selectedBuildId) return;
    setApprovingBuild(true);
    setApproveError('');
    setApproveResult(null);
    try {
      const res = await adminFetch(`/api/admin/jobs/${slug}/approve-build`, {
        method: 'POST',
        body: JSON.stringify({ buildId: selectedBuildId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApproveError(json.error ?? 'Approval failed');
        return;
      }
      setApproveResult({ paymentLink: json.paymentLink, inviteLink: json.inviteLink });
      mutate();
    } finally {
      setApprovingBuild(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!job) return <Layout><p className="text-sm text-red-600">Job not found.</p></Layout>;

  const statusMeta = STATUS_COLORS[job.status];

  return (
    <Layout>
      <div className="max-w-3xl space-y-8">
        <button
          onClick={() => navigate('/jobs')}
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
        >
          ← Back to jobs
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{job.businessName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{job.id} · {job.pageType ?? 'unknown type'}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMeta}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>

        {/* Timeline */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Timeline</h2>
          <div className="flex items-start gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const ts = (job as any)[step.key]?._seconds;
              const reached = !!ts;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center">
                  <div className="flex items-center w-full">
                    {i > 0 && <div className={`flex-1 h-0.5 ${reached ? 'bg-[#2087e6]' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                    <div className={`w-3 h-3 rounded-full border-2 ${reached ? 'bg-[#2087e6] border-[#2087e6]' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700'}`} />
                    {i < TIMELINE_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${reached ? 'bg-[#2087e6]' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${reached ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{step.label}</p>
                  {ts && <p className="text-[10px] text-gray-400 mt-0.5">{timeStr(ts)}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Materials */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Materials</h2>
          {job.materialsNotes && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-400">
              {job.materialsNotes}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            {job.materials.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Material {i + 1} ↗
              </a>
            ))}
            {job.materials.length === 0 && (
              <p className="text-sm text-gray-400">No materials yet.</p>
            )}
          </div>

          {/* Add materials */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add materials</p>
            <textarea
              value={materialUrls}
              onChange={(e) => setMaterialUrls(e.target.value)}
              placeholder="Paste URLs, one per line"
              className="w-full h-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
            />
            <input
              type="text"
              value={materialNotes}
              onChange={(e) => setMaterialNotes(e.target.value)}
              placeholder="Notes for the developer (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
            />
            <button
              onClick={handleAddMaterials}
              disabled={addingMaterials || !materialUrls.trim()}
              className="text-sm px-3 py-2 bg-[#2087e6] text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              {addingMaterials ? 'Saving…' : 'Add materials'}
            </button>
          </div>
        </section>

        {/* Builds */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Builds</h2>
          {job.builds.length === 0 ? (
            <p className="text-sm text-gray-400">No builds yet — waiting for dev to push.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {job.builds.map((build) => (
                <div
                  key={build.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    job.approvedBuildId === build.id
                      ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-16">Build {build.buildNumber}</span>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {build.devName} · {build.claudeModel}
                        {build.createdAt && ` · ${timeStr(build.createdAt._seconds)}`}
                      </p>
                    </div>
                    {job.approvedBuildId === build.id && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-medium">
                        Approved
                      </span>
                    )}
                  </div>
                  <a
                    href={build.stagingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    View staging →
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Approve build */}
          {job.status === 'in_review' && job.builds.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Approve a build</p>
              <select
                value={selectedBuildId}
                onChange={(e) => setSelectedBuildId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
              >
                {job.builds.map((build) => (
                  <option key={build.id} value={build.id}>
                    Build {build.buildNumber} — {build.devName}{build.createdAt ? ` (${timeStr(build.createdAt._seconds)})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApproveBuild}
                disabled={approvingBuild || !selectedBuildId}
                className="text-sm px-4 py-2 bg-[#2087e6] text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors font-medium"
              >
                {approvingBuild ? 'Approving…' : 'Approve & Send Links'}
              </button>
              {approveError && <p className="text-sm text-red-600">{approveError}</p>}
              {approveResult && (
                <div className="space-y-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">✓ Approved — copy these links</p>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment link</p>
                    <code className="text-xs break-all text-gray-700 dark:text-gray-300">{approveResult.paymentLink}</code>
                  </div>
                  {approveResult.inviteLink && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Portal invite link</p>
                      <code className="text-xs break-all text-gray-700 dark:text-gray-300">{approveResult.inviteLink}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Retry promotion */}
          {job.status === 'publish_pending' && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">Promotion failed — retry</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">The staging→production copy failed on payment. Fix the issue then retry.</p>
              <button
                onClick={handleRetryPromotion}
                disabled={retrying}
                className="text-sm px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
              >
                {retrying ? 'Promoting…' : 'Retry promotion'}
              </button>
              {retryError && <p className="text-sm text-red-600 dark:text-red-400">{retryError}</p>}
              {retryOk && <p className="text-sm text-green-700 dark:text-green-400">✓ Promoted to production successfully</p>}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
