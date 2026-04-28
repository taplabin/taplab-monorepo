import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import PageUnavailable from '../components/PageUnavailable';
import ErrorFallback from '../components/ErrorFallback';

// Module-level Set; persists across navigations
const loadedSlugs = new Set<string>();

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; tagName: string }
  | { status: 'inactive' }
  | { status: 'error'; message: string };

const LOAD_TIMEOUT_MS = 8000;

export default function BusinessPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!businessSlug) return;
    let cancelled = false;
    const slug = businessSlug; // Capture for type safety

    async function loadPage() {
      setPageState({ status: 'loading' });

      // 1. Ask backend if this page is active
      let data: { status: string; jsUrl?: string; componentTagName?: string };
      try {
        const res = await fetch(`/api/page/${slug}`);

        // 404 means business doesn't exist - treat as inactive
        if (res.status === 404) {
          if (!cancelled) setPageState({ status: 'inactive' });
          return;
        }

        if (!res.ok) throw new Error(`API ${res.status}`);
        data = await res.json();
      } catch (err) {
        if (!cancelled) {
          setPageState({
            status: 'error',
            message: 'Could not reach server. Please try again.',
          });
        }
        return;
      }

      if (data.status === 'inactive') {
        if (!cancelled) setPageState({ status: 'inactive' });
        return;
      }

      const { jsUrl, componentTagName } = data;
      if (!jsUrl || !componentTagName) {
        if (!cancelled) {
          setPageState({
            status: 'error',
            message: 'Page configuration is invalid.',
          });
        }
        return;
      }

      // 2. Inject script only once per slug per session
      if (!loadedSlugs.has(slug)) {
        loadedSlugs.add(slug);
        try {
          await injectScript(jsUrl);
        } catch (err) {
          if (!cancelled) {
            setPageState({
              status: 'error',
              message: 'Failed to load page script.',
            });
          }
          return;
        }
      }

      // 3. Wait for the custom element to register (with timeout)
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
        );
        await Promise.race([
          customElements.whenDefined(componentTagName),
          timeout,
        ]);
      } catch {
        if (!cancelled) {
          setPageState({
            status: 'error',
            message: 'Page took too long to load.',
          });
        }
        return;
      }

      if (!cancelled) setPageState({ status: 'ready', tagName: componentTagName });
    }

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

  if (pageState.status === 'loading') return <LoadingSpinner />;
  if (pageState.status === 'inactive') return <PageUnavailable />;
  if (pageState.status === 'error') return <ErrorFallback message={pageState.message} />;

  // Render the custom element
  const Tag = pageState.tagName as keyof JSX.IntrinsicElements;
  return <Tag />;
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
