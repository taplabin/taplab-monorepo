import { useCallback, useRef, useState } from 'react';
import { transform } from 'sucrase';

function extractDefaultContent(contentTs: string): Record<string, string> {
  const match = contentTs.match(/export\s+const\s+defaultContent[^=]*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) return {};
  try {
    return new Function(`return (${match[1]})`)() as Record<string, string>;
  } catch {
    return {};
  }
}

function buildSrcdoc(appTsx: string, defaultContent: Record<string, string>): string {
  // Preprocess: replace import.meta.env references
  let code = appTsx;
  code = code.replace(/import\.meta\.env\.DEV/g, 'true');
  code = code.replace(/import\.meta\.env\.\w+/g, 'undefined');

  let transformed: string;
  try {
    transformed = transform(code, { transforms: ['typescript', 'jsx'] }).code;
  } catch (err: any) {
    return `<html><body style="font-family:monospace;padding:16px;color:red">Transpile error: ${err?.message ?? err}</body></html>`;
  }

  // Strip import statements (they'll be globals in the iframe)
  transformed = transformed.replace(/^(import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*\n?)/gm, '');
  transformed = transformed.replace(/^(import\s+['"][^'"]*['"]\s*;?\s*\n?)/gm, '');

  const contentJson = JSON.stringify(defaultContent);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>* { box-sizing: border-box; } body { margin: 0; }</style>
</head>
<body>
  <div id="root"></div>
  <script>
  (function() {
    const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = React;

    const __defaultContent = ${contentJson};

    // Stub: return empty object for content fetches, block analytics
    const _origFetch = window.fetch;
    window.fetch = function(url) {
      const urlStr = String(url);
      if (urlStr.includes('/content') || urlStr.includes('/pageview') || urlStr.includes('/session')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return _origFetch.apply(window, arguments);
    };

    // Make content immediately available so the null guard passes
    // Patch useState to pre-fill content on first render
    const _origUseState = React.useState;
    let __contentPatched = false;
    window.__patchUseState = function(initial) {
      if (!__contentPatched && initial === null) {
        __contentPatched = true;
        const [state, setState] = _origUseState(__defaultContent);
        return [state, setState];
      }
      return _origUseState(initial);
    };

    ${transformed}

    const AppComponent = typeof App !== 'undefined' ? App : undefined;
    if (!AppComponent) {
      document.getElementById('root').innerHTML = '<p style="color:red;padding:16px;font-family:monospace">Could not find App export</p>';
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
