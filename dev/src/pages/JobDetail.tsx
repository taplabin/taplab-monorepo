import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MaterialsGallery from '../components/MaterialsGallery';
import CodeTextArea from '../components/CodeTextArea';
import ImageUploadHelper from '../components/ImageUploadHelper';
import ValidationPanel, { validate, ValidationResult } from '../components/ValidationPanel';
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
  queued:          { label: 'Queued',          color: 'bg-gray-100 text-gray-600' },
  claimed:         { label: 'Claimed',         color: 'bg-blue-100 text-blue-700' },
  in_review:       { label: 'In review',       color: 'bg-yellow-100 text-yellow-700' },
  approved:        { label: 'Approved',        color: 'bg-green-100 text-green-700' },
  publish_pending: { label: 'Publish pending', color: 'bg-orange-100 text-orange-700' },
  live:            { label: 'Live',            color: 'bg-emerald-100 text-emerald-700' },
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
      const res = await devFetch(`/dev/jobs/${slug}/push-staging`, {
        method: 'POST',
        body: JSON.stringify({ appTsx, contentTs, claudeModel }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setPushError(e.error ?? 'Build failed');
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
      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to queue
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : job ? (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{job.businessName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{job.pageType ?? 'Unknown type'}</p>
            </div>
            {statusMeta && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          {/* Materials */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Materials</h2>
            <MaterialsGallery materials={job.materials} notes={job.materialsNotes} />
          </section>

          {/* Image upload */}
          <section>
            <ImageUploadHelper slug={slug!} />
          </section>

          {/* Code paste */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Paste generated code</h2>
            <CodeTextArea
              label="App.tsx"
              value={appTsx}
              onChange={(v) => { setAppTsx(v); setValidationResult(null); setShowSandbox(false); }}
              placeholder="Paste the full App.tsx content here…"
            />
            <CodeTextArea
              label="content.ts"
              value={contentTs}
              onChange={(v) => { setContentTs(v); setValidationResult(null); setShowSandbox(false); }}
              placeholder="Paste the full content.ts content here…"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Claude model used</label>
              <input
                type="text"
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 w-64"
              />
            </div>
          </section>

          {/* Actions */}
          <section>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { setShowSandbox(true); setValidationResult(null); }}
                disabled={!appTsx.trim() || !contentTs.trim()}
                className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Preview in sandbox
              </button>
              <button
                onClick={handleValidate}
                disabled={!appTsx.trim() || !contentTs.trim()}
                className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Validate
              </button>
              <button
                onClick={handlePushToStaging}
                disabled={!validationPassed || pushing}
                className="text-sm px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {pushing ? 'Building…' : 'Push to staging'}
              </button>
            </div>

            {!validationPassed && validationResult && (
              <p className="text-xs text-gray-500 mt-2">Fix validation errors to enable staging push.</p>
            )}
            {pushError && (
              <p className="text-sm text-red-600 mt-2">{pushError}</p>
            )}
            {lastStagingUrl && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800 font-medium">Build pushed!</p>
                <a
                  href={lastStagingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 underline"
                >
                  {lastStagingUrl}
                </a>
              </div>
            )}
          </section>

          {/* Validation result */}
          <ValidationPanel result={validationResult} />

          {/* Sandbox */}
          {showSandbox && appTsx.trim() && contentTs.trim() && (
            <section>
              <SandboxPreview appTsx={appTsx} contentTs={contentTs} />
            </section>
          )}

          {/* Build history */}
          {builds.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Build history</h2>
              <BuildHistory builds={builds} approvedBuildId={job.approvedBuildId} />
            </section>
          )}
        </div>
      ) : null}
    </Layout>
  );
}
