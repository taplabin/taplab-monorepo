import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MaterialsGallery from '../components/MaterialsGallery';
import CodeEditor from '../components/CodeEditor';
import ImageUploadHelper from '../components/ImageUploadHelper';
import ValidationPanel, { validate, extractDefaultContent, ValidationResult } from '../components/ValidationPanel';
import SandboxPreview from '../components/SandboxPreview';
import BuildHistory from '../components/BuildHistory';
import { devFetch } from '../lib/api';

interface Job {
  id: string;
  businessName: string;
  pageType: string | null;
  status: string;
  materials: string[];
  materialsNotes: string | null;
  approvedBuildId: string | null;
}

interface Build {
  id: string;
  buildNumber: number;
  stagingUrl: string;
  devName: string;
  claudeModel: string;
  createdAt: { _seconds: number } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued:          { label: 'Queued',          color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  claimed:         { label: 'Claimed',         color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  in_review:       { label: 'In review',       color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  approved:        { label: 'Approved',        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  publish_pending: { label: 'Publish pending', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  live:            { label: 'Live',            color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
};

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [appTsx, setAppTsx] = useState('');
  const [contentTs, setContentTs] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-6');

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSandbox, setShowSandbox] = useState(false);

  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [lastStagingUrl, setLastStagingUrl] = useState<string | null>(null);

  async function loadJob() {
    if (!slug) return;
    setLoading(true);
    try {
      const [jobRes, buildsRes] = await Promise.all([
        devFetch(`/dev/jobs/${slug}`),
        devFetch(`/dev/jobs/${slug}/builds`),
      ]);
      if (!jobRes.ok) {
        const e = await jobRes.json();
        setError(e.error ?? 'Could not load job');
        return;
      }
      const jobData = await jobRes.json();
      setJob(jobData);

      if (buildsRes.ok) {
        const bData = await buildsRes.json();
        setBuilds(bData.builds ?? []);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadJob(); }, [slug]);

  function handleValidate() {
    const result = validate(appTsx, contentTs);
    setValidationResult(result);
    setShowSandbox(false);
  }

  async function handlePushToStaging() {
    if (!slug || !validationResult?.passed) return;
    setPushing(true);
    setPushError('');
    try {
      const defaultContent = extractDefaultContent(contentTs);
      const contentKeys = defaultContent ? Object.keys(defaultContent) : [];
      const res = await devFetch(`/dev/jobs/${slug}/push-staging`, {
        method: 'POST',
        body: JSON.stringify({ appTsx, contentTs, claudeModel, contentKeys }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setPushError(e.details ? `${e.error ?? 'Build failed'}: ${e.details}` : (e.error ?? 'Build failed'));
        return;
      }
      const data = await res.json();
      setLastStagingUrl(data.stagingUrl);
      await loadJob();
    } catch {
      setPushError('Network error');
    } finally {
      setPushing(false);
    }
  }

  const validationPassed = validationResult?.passed === true;
  const statusMeta = STATUS_LABELS[job?.status ?? ''];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
        >
          ← Back to queue
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : job ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{job.businessName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{job.pageType ?? 'Unknown type'}</p>
              </div>
              {statusMeta && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMeta.color}`}>
                  {statusMeta.label}
                </span>
              )}
            </div>

            {/* Materials */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Materials</h2>
              <MaterialsGallery materials={job.materials} notes={job.materialsNotes} />
            </div>

            {/* Image upload */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <ImageUploadHelper slug={slug!} />
            </div>

            {/* Code editors */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Code</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Paste the generated files below, then validate and push to staging.</p>
              </div>
              <CodeEditor
                label="App.tsx"
                value={appTsx}
                onChange={(v) => { setAppTsx(v); setValidationResult(null); setShowSandbox(false); }}
              />
              <CodeEditor
                label="content.ts"
                value={contentTs}
                onChange={(v) => { setContentTs(v); setValidationResult(null); setShowSandbox(false); }}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Claude model used</label>
                <input
                  type="text"
                  value={claudeModel}
                  onChange={(e) => setClaudeModel(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6] w-64"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => { setShowSandbox(true); setValidationResult(null); }}
                  disabled={!appTsx.trim() || !contentTs.trim()}
                  className="text-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Preview in sandbox
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!appTsx.trim() || !contentTs.trim()}
                  className="text-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Validate
                </button>
                <button
                  onClick={handlePushToStaging}
                  disabled={!validationPassed || pushing}
                  className="text-sm px-4 py-2 bg-[#2087e6] hover:bg-[#13204d] text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pushing ? 'Building…' : 'Push to staging'}
                </button>
              </div>

              {!validationPassed && validationResult && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Fix validation errors to enable staging push.</p>
              )}
              {pushError && (
                <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>
              )}
              {lastStagingUrl && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm text-green-800 dark:text-green-400 font-medium">Build pushed!</p>
                  <a
                    href={lastStagingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 dark:text-green-500 underline"
                  >
                    {lastStagingUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Validation result */}
            <ValidationPanel result={validationResult} />

            {/* Sandbox */}
            {showSandbox && appTsx.trim() && contentTs.trim() && (
              <SandboxPreview appTsx={appTsx} contentTs={contentTs} />
            )}

            {/* Build history */}
            {builds.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Build history</h2>
                <BuildHistory builds={builds} approvedBuildId={job.approvedBuildId} />
              </div>
            )}
          </>
        ) : null}

      </div>
    </Layout>
  );
}
