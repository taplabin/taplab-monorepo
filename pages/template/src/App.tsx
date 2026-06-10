import { useState, useEffect } from 'react';
import { defaultContent } from './content';

const API_BASE = 'https://api.taplab.in';
const ANALYTICS_URL = 'https://poop.taplab.in';

export default function PageApp({ slug }: { slug: string }) {
  const [content, setContent] = useState<Record<string, string> | null>(null);

  // Content fetch + pageview event
  useEffect(() => {
    const isReturning = !!localStorage.getItem('taplab_v');
    if (!isReturning) localStorage.setItem('taplab_v', '1');

    const params = new URLSearchParams(window.location.search);

    fetch(`${API_BASE}/page/${slug}/content`)
      .then((r) => r.json())
      .then((data) => {
        setContent({ ...defaultContent, ...data });
        fetch(`${ANALYTICS_URL}/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: slug,
            referrer: document.referrer,
            screenWidth: window.screen.width,
            language: navigator.language,
            returning: isReturning,
            utmSource:   params.get('utm_source')   ?? 'none',
            utmMedium:   params.get('utm_medium')   ?? 'none',
            utmCampaign: params.get('utm_campaign') ?? 'none',
          }),
        }).catch(() => {});
      })
      .catch(() => setContent(defaultContent));
  }, [slug]);

  // Session duration tracking — fires on tab hide/close via sendBeacon
  useEffect(() => {
    const startTime = Date.now();
    let sent = false;

    function sendSession() {
      if (sent) return;
      sent = true;
      const duration = Math.round((Date.now() - startTime) / 1000);
      fetch(`${ANALYTICS_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: slug, duration }),
        keepalive: true,
      }).catch(() => {});
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') sendSession();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', sendSession);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', sendSession);
    };
  }, []);

  if (!content) return null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 text-white p-6">
        <h1 className="text-3xl font-bold">{content.heading}</h1>
        <p className="text-sm mt-1">{content.subheading}</p>
      </header>
      <section className="p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Welcome to TapLab!</h2>
          <p className="text-gray-600">{content.body}</p>
        </div>
      </section>
    </main>
  );
}
