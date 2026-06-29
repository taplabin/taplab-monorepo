import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorFallback from '../components/ErrorFallback';

const loadedTokens = new Set<string>();

const LOAD_TIMEOUT_MS = 8000;

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; tagName: string }
  | { status: 'error'; message: string };

export default function PreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadPreview() {
      setPageState({ status: 'loading' });

      let data: { jsUrl?: string; componentTagName?: string };
      try {
        const res = await fetch(`/api/preview/${token}`);
        if (res.status === 404) {
          if (!cancelled) setPageState({ status: 'error', message: 'Preview not found.' });
          return;
        }
        if (!res.ok) throw new Error(`API ${res.status}`);
        data = await res.json();
      } catch {
        if (!cancelled) setPageState({ status: 'error', message: 'Could not load preview.' });
        return;
      }

      const { jsUrl, componentTagName } = data;
      if (!jsUrl || !componentTagName) {
        if (!cancelled) setPageState({ status: 'error', message: 'Invalid preview configuration.' });
        return;
      }

      if (!loadedTokens.has(token!)) {
        loadedTokens.add(token!);
        try {
          await injectScript(jsUrl);
        } catch {
          if (!cancelled) setPageState({ status: 'error', message: 'Failed to load preview script.' });
          return;
        }
      }

      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
        );
        await Promise.race([customElements.whenDefined(componentTagName), timeout]);
      } catch {
        if (!cancelled) setPageState({ status: 'error', message: 'Preview took too long to load.' });
        return;
      }

      if (!cancelled) setPageState({ status: 'ready', tagName: componentTagName });
    }

    loadPreview();
    return () => { cancelled = true; };
  }, [token]);

  if (pageState.status === 'loading') return <LoadingSpinner />;
  if (pageState.status === 'error') return <ErrorFallback message={pageState.message} />;

  const Tag = pageState.tagName as keyof JSX.IntrinsicElements;
  return (
    <div>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#7c3aed', color: '#fff', textAlign: 'center',
        padding: '6px 12px', fontSize: '13px', fontFamily: 'system-ui, sans-serif',
      }}>
        Staging preview — not live
      </div>
      <div style={{ paddingTop: '30px' }}>
        <Tag />
      </div>
    </div>
  );
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
