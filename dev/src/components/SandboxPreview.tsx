import { useCallback, useState } from 'react';
import { transform } from 'sucrase';

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
        '<div style="padding:20px;font-family:monospace;color:#dc2626;background:#fef2f2;border-radius:8px;margin:16px">' +
        '<b>Could not access React from parent frame.</b><br>Refresh the dev panel and try again.' +
        '</div>';
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
    createRoot(document.getElementById('root')).render(
      React.createElement(AppComponent, { slug: 'preview' })
    );
  })();
  </script>
</body>
</html>`;
}

interface SandboxPreviewProps {
  appTsx: string;
  contentTs: string;
}

export default function SandboxPreview({ appTsx, contentTs }: SandboxPreviewProps) {
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const runPreview = useCallback(() => {
    setBuilding(true);
    setTimeout(() => {
      const defaultContent = extractDefaultContent(contentTs);
      setSrcdoc(buildSrcdoc(appTsx, defaultContent));
      setBuilding(false);
    }, 0);
  }, [appTsx, contentTs]);

  const toolbar = (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sandbox preview</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
          Tailwind CDN · may differ from build
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={runPreview}
          disabled={building}
          className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium"
        >
          {building ? 'Building…' : srcdoc ? 'Refresh' : 'Run preview'}
        </button>
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        {/* Fullscreen toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sandbox preview</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              Tailwind CDN · may differ from build
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runPreview}
              disabled={building}
              className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium"
            >
              {building ? 'Building…' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ExitFullscreenIcon />
              Exit fullscreen
            </button>
          </div>
        </div>
        {/* Fullscreen iframe */}
        {srcdoc ? (
          <iframe
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-same-origin"
            className="flex-1 w-full bg-white"
            title="Sandbox preview"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Click "Run preview" to render the component.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {toolbar}
      {srcdoc ? (
        <iframe
          srcDoc={srcdoc}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-[600px] bg-white"
          title="Sandbox preview"
        />
      ) : (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Click "Run preview" to render the component.
        </div>
      )}
    </div>
  );
}

function FullscreenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4m0 5H4m16 0h-5m5 0V4M9 20v-5m0 5H4m16 0h-5m5 0v-5" />
    </svg>
  );
}
