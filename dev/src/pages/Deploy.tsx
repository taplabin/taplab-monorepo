import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJob } from '../context/JobContext';
import { devFetch } from '../lib/api';

const CLAUDE_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-8',
  'claude-haiku-4-5-20251001',
];

const SUCCESS_LINES = [
  '$ tsc --noEmit',
  '✓ TypeScript compiled successfully',
  '$ vite build --mode staging',
  '✓ Dependencies bundled',
  '✓ CSS inlined into bundle',
  '✓ Minified with Terser',
  '↑ Uploading to staging R2...',
  '✓ Bundle uploaded',
  '✓ Firestore record updated',
  '──────────────────────────────────',
  '✓ Done',
];

export default function Deploy() {
  const navigate = useNavigate();
  const { slug, appTsx, contentTs, claudeModel, setClaudeModel, validationResult, reloadBuilds } = useJob();

  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [lastStagingUrl, setLastStagingUrl] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const hasCode = appTsx.trim() !== '' && contentTs.trim() !== '';
  const validationPassed = validationResult?.passed === true;
  const canPush = hasCode && validationPassed && !pushing;

  async function handlePush() {
    if (!canPush) return;
    setPushing(true);
    setPushError('');
    setLastStagingUrl(null);
    setBuildLog([]);

    try {
      const res = await devFetch(`/dev/jobs/${slug}/push-staging`, {
        method: 'POST',
        body: JSON.stringify({ appTsx, contentTs, claudeModel }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e.details ? `${e.error ?? 'Build failed'}: ${e.details}` : (e.error ?? 'Build failed');
        setPushError(msg);
        setBuildLog(['✗ Build failed', msg]);
        return;
      }

      const data = await res.json();
      setLastStagingUrl(data.stagingUrl);

      const lines = [...SUCCESS_LINES, `  ${data.stagingUrl}`];
      lines.forEach((line, i) => {
        setTimeout(() => setBuildLog(prev => [...prev, line]), i * 110);
      });

      await reloadBuilds();
    } catch {
      setPushError('Network error — try again');
      setBuildLog(['✗ Network error']);
    } finally {
      setPushing(false);
    }
  }

  function copyUrl() {
    if (!lastStagingUrl) return;
    navigator.clipboard.writeText(lastStagingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-[#1e1e1e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Model selector */}
        <section>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
            Claude model
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {CLAUDE_MODELS.map(m => (
              <button
                key={m}
                onClick={() => setClaudeModel(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
                  claudeModel === m
                    ? 'bg-[#2087e6] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
            <input
              type="text"
              value={claudeModel}
              onChange={e => setClaudeModel(e.target.value)}
              placeholder="or type a model ID"
              className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
            />
          </div>
        </section>

        {/* Validation status */}
        <section>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
            Validation
          </label>
          {!hasCode ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <span>○</span>
              <span>No code in editor yet.</span>
              <button onClick={() => navigate(`/job/${slug}/editor`)} className="text-[#2087e6] hover:underline">Go to Editor →</button>
            </div>
          ) : validationResult === null ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">○ Not validated yet.</span>
              <button onClick={() => navigate(`/job/${slug}/preview`)} className="text-sm text-[#2087e6] hover:underline">
                Validate in Preview →
              </button>
            </div>
          ) : validationPassed ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <span>✓</span>
              <span>All checks passed — ready to push.</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 dark:text-red-400">
                ✗ {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''} — fix them first.
              </span>
              <button onClick={() => navigate(`/job/${slug}/preview`)} className="text-sm text-[#2087e6] hover:underline">
                Go to Preview →
              </button>
            </div>
          )}
        </section>

        {/* Push button */}
        <section>
          <button
            onClick={handlePush}
            disabled={!canPush}
            className="flex items-center gap-2 px-6 py-3 bg-[#2087e6] hover:bg-[#1a72c4] text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
          >
            {pushing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Building…
              </>
            ) : (
              <>
                <UploadIcon />
                Push to staging
              </>
            )}
          </button>
          {!validationPassed && hasCode && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Validation must pass before you can push.</p>
          )}
        </section>

        {/* Build log */}
        {buildLog.length > 0 && (
          <section>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
              Build log
            </label>
            <div className="rounded-xl overflow-hidden border border-gray-800 dark:border-gray-700">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 border-b border-gray-800">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-2 text-xs text-gray-500 font-mono">build log</span>
              </div>
              <div className="bg-gray-950 px-4 py-4 font-mono text-sm space-y-0.5 min-h-[80px]">
                {buildLog.map((line, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      line.startsWith('✓') ? 'text-emerald-400' :
                      line.startsWith('↑') ? 'text-blue-400' :
                      line.startsWith('✗') ? 'text-red-400' :
                      line.startsWith('$') ? 'text-gray-300' :
                      line.startsWith('──') ? 'text-gray-700' :
                      line.startsWith('  ') ? 'text-blue-300 underline' :
                      'text-gray-500'
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {pushing && (
                  <div className="text-gray-500 animate-pulse">▋</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Staging URL */}
        {lastStagingUrl && !pushError && (
          <section className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2">Build pushed to staging</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-green-700 dark:text-green-500 bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded-lg truncate">
                {lastStagingUrl}
              </code>
              <button
                onClick={copyUrl}
                className="text-xs px-2.5 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors font-medium flex-shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={lastStagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1.5 bg-[#2087e6] text-white rounded-lg hover:bg-[#1a72c4] transition-colors font-medium flex-shrink-0"
              >
                View ↗
              </a>
            </div>
            <p className="text-xs text-green-600 dark:text-green-600 mt-2">
              Admin will review this staging link before approving.
            </p>
          </section>
        )}

        {pushError && !buildLog.length && (
          <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>
        )}

      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}
