import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { transform } from 'sucrase';
import { useJob } from '../context/JobContext';
import { validate } from '../components/ValidationPanel';

type Device = 'desktop' | 'mobile';

function extractDefaultContent(contentTs: string): Record<string, unknown> {
  try {
    const { code } = transform(contentTs, { transforms: ['typescript', 'imports'] });
    const exports: Record<string, unknown> = {};
    const mod = { exports };
    // eslint-disable-next-line no-new-func
    new Function('exports', 'module', 'require', code)(exports, mod, () => ({}));
    return (exports.defaultContent ?? mod.exports.defaultContent ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildSrcdoc(appTsx: string, defaultContent: Record<string, unknown>): string {
  let code = appTsx;
  code = code.replace(/import\.meta\.env\.DEV/g, 'true');
  code = code.replace(/import\.meta\.env\.\w+/g, 'undefined');

  let transformed: string;
  try {
    transformed = transform(code, { transforms: ['typescript', 'jsx', 'imports'] }).code;
  } catch (err: any) {
    return `<html><body style="font-family:monospace;padding:16px;color:red">Transpile error: ${err?.message ?? err}</body></html>`;
  }

  const contentJson = JSON.stringify(defaultContent);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>* { box-sizing: border-box; } body { margin: 0; }</style>
</head>
<body>
  <div id="root"></div>
  <script>
  (function() {
    const React = parent.__tapReact__;
    const ReactDOM = parent.__tapReactDOM__;
    if (!React || !ReactDOM) {
      document.getElementById('root').innerHTML =
        '<div style="padding:20px;font-family:monospace;color:#dc2626">Could not access React from parent frame. Refresh and try again.</div>';
      return;
    }
    const __defaultContent = ${contentJson};
    const _origUseState = React.useState;
    let __contentPatched = false;
    React.useState = function(initial) {
      if (!__contentPatched && initial === null) {
        __contentPatched = true;
        return _origUseState(__defaultContent);
      }
      return _origUseState.apply(this, arguments);
    };
    const exports = {};
    const module = { exports };
    function require(mod) {
      if (mod === 'react') return React;
      if (mod === 'react-dom') return ReactDOM;
      if (mod === 'react-dom/client') return ReactDOM;
      return {};
    }
    const _origFetch = window.fetch;
    window.fetch = function(url) {
      const s = String(url);
      if (s.includes('/content') || s.includes('/pageview') || s.includes('/session')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(__defaultContent) });
      }
      return _origFetch.apply(window, arguments);
    };
    ${transformed}
    const AppComponent = (exports && exports.default) || (module.exports && module.exports.default);
    if (!AppComponent) {
      document.getElementById('root').innerHTML =
        '<p style="color:red;padding:16px;font-family:monospace">Could not find App default export.</p>';
      return;
    }
    const createRoot = ReactDOM.createRoot || (ReactDOM.default && ReactDOM.default.createRoot);
    createRoot(document.getElementById('root')).render(React.createElement(AppComponent, { slug: 'preview' }));
  })();
  </script>
</body>
</html>`;
}

export default function Preview() {
  const navigate = useNavigate();
  const { slug, appTsx, contentTs, validationResult, setValidationResult } = useJob();

  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [building, setBuilding] = useState(false);

  const hasCode = appTsx.trim() !== '' || contentTs.trim() !== '';
  const validationPassed = validationResult?.passed === true;

  function runValidation() {
    const result = validate(appTsx, contentTs);
    setValidationResult(result);
    if (result.passed) {
      runPreview();
    }
  }

  const runPreview = useCallback(() => {
    setBuilding(true);
    setTimeout(() => {
      const defaultContent = extractDefaultContent(contentTs);
      setSrcdoc(buildSrcdoc(appTsx, defaultContent));
      setBuilding(false);
    }, 0);
  }, [appTsx, contentTs]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1e1e1e]">

      {/* Toolbar */}
      <div className="flex-shrink-0 h-11 flex items-center gap-3 px-4 bg-gray-50 dark:bg-[#252526] border-b border-gray-200 dark:border-[#2d2d2d]">

        {/* Validation */}
        <button
          onClick={runValidation}
          disabled={!hasCode}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          <ShieldIcon />
          Run validation
        </button>

        {/* Validation badge */}
        {validationResult !== null && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            validationPassed
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {validationPassed
              ? `✓ ${9 - (validationResult.errors.length)} / 9 passed`
              : `✗ ${validationResult.errors.length} error${validationResult.errors.length !== 1 ? 's' : ''}`
            }
          </span>
        )}

        <div className="flex-1" />

        {/* Refresh */}
        {srcdoc && (
          <button
            onClick={runPreview}
            disabled={building}
            className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Refresh preview"
          >
            <RefreshIcon />
          </button>
        )}

        {/* Device toggle */}
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded transition-colors ${device === 'desktop' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            title="Desktop view"
          >
            <DesktopIcon />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded transition-colors ${device === 'mobile' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            title="Mobile view (390px)"
          >
            <MobileIcon />
          </button>
        </div>

        {/* Go to deploy */}
        {validationPassed && (
          <button
            onClick={() => navigate(`/job/${slug}/deploy`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2087e6] hover:bg-[#1a72c4] text-white rounded-lg transition-colors"
          >
            Push to staging
            <span>→</span>
          </button>
        )}
      </div>

      {/* Validation errors panel */}
      {validationResult && !validationPassed && (
        <div className="flex-shrink-0 px-4 py-3 bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-900/30 space-y-1 max-h-40 overflow-y-auto">
          {validationResult.errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700 dark:text-red-400">✗ {e}</p>
          ))}
          {validationResult.warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-400">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-[#141414]">
        {!hasCode ? (
          <EmptyState message="Write some code in the Editor first." actionLabel="Go to Editor" actionTo={`/job/${slug}/editor`} />
        ) : !srcdoc ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {validationResult === null ? 'Run validation to preview your page' : validationPassed ? 'Click below to render the preview' : 'Fix validation errors first'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Tailwind CDN is used — may differ slightly from the real build</p>
            </div>
            {(validationResult === null || validationPassed) && (
              <button
                onClick={validationResult === null ? runValidation : runPreview}
                disabled={building || (!validationPassed && validationResult !== null)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2087e6] text-white rounded-lg text-sm font-medium hover:bg-[#1a72c4] disabled:opacity-50 transition-colors"
              >
                {building ? 'Building…' : validationResult === null ? 'Validate & Preview' : 'Run Preview'}
              </button>
            )}
          </div>
        ) : device === 'desktop' ? (
          <iframe
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full bg-white"
            title="Sandbox preview"
          />
        ) : (
          <div className="h-full flex items-start justify-center pt-8 overflow-y-auto">
            <div className="flex-shrink-0 w-[390px] rounded-[36px] border-[8px] border-gray-800 shadow-2xl overflow-hidden bg-white" style={{ height: '812px' }}>
              <iframe
                srcDoc={srcdoc}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full"
                title="Sandbox preview (mobile)"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function EmptyState({ message, actionLabel, actionTo }: { message: string; actionLabel: string; actionTo: string }) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
      <button
        onClick={() => navigate(actionTo)}
        className="text-sm text-[#2087e6] dark:text-blue-400 hover:underline"
      >
        {actionLabel} →
      </button>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
