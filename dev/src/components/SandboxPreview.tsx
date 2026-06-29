import { useCallback, useState } from 'react';
import { transform } from 'sucrase';

function extractDefaultContent(contentTs: string): Record<string, unknown> {
  const match = contentTs.match(/export\s+const\s+defaultContent[^=]*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) return {};
  try {
    return new Function(`return (${match[1]})`)() as Record<string, unknown>;
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
    // 'imports' converts ES module imports → CommonJS require() so no import statements remain
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
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>* { box-sizing: border-box; } body { margin: 0; }</style>
</head>
<body>
  <div id="root"></div>
  <script>
  (function() {
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      document.getElementById('root').innerHTML =
        '<div style="padding:20px;font-family:monospace;color:#dc2626;background:#fef2f2;border-radius:8px;margin:16px">' +
        '<b>React failed to load from CDN.</b><br><br>' +
        'Your browser is blocking unpkg.com (likely an ad blocker).<br>' +
        'Disable it for this page, then refresh and run preview again.' +
        '</div>';
      return;
    }

    const __defaultContent = ${contentJson};

    // Patch useState BEFORE require('react') is called below, so the component
    // gets content immediately on first render (skipping the null guard).
    const _origUseState = React.useState;
    let __contentPatched = false;
    React.useState = function(initial) {
      if (!__contentPatched && initial === null) {
        __contentPatched = true;
        return _origUseState(__defaultContent);
      }
      return _origUseState.apply(this, arguments);
    };

    // CommonJS shim — Sucrase converts imports to require() calls
    const exports = {};
    const module = { exports };
    function require(mod) {
      if (mod === 'react') return React;
      if (mod === 'react-dom') return ReactDOM;
      if (mod === 'react-dom/client') return ReactDOM;
      return {};
    }

    // Stub content fetches so the component gets data without a real API
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

    ReactDOM.createRoot(document.getElementById('root')).render(
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

  const runPreview = useCallback(() => {
    setBuilding(true);
    setTimeout(() => {
      const defaultContent = extractDefaultContent(contentTs);
      setSrcdoc(buildSrcdoc(appTsx, defaultContent));
      setBuilding(false);
    }, 0);
  }, [appTsx, contentTs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Sandbox preview</span>
        <span className="text-xs text-gray-400">Browser-only · Tailwind CDN (may differ from real build)</span>
      </div>
      <button
        onClick={runPreview}
        disabled={building}
        className="mb-3 text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {building ? 'Building preview…' : srcdoc ? 'Refresh preview' : 'Run preview'}
      </button>
      {srcdoc && (
        <iframe
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          className="w-full h-[600px] border border-gray-200 rounded-xl bg-white"
          title="Sandbox preview"
        />
      )}
    </div>
  );
}
