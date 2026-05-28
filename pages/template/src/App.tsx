import { useState, useEffect } from 'react';
import { defaultContent } from './content';

const API_BASE = 'https://api.taplab.in';

export default function PageApp({ slug }: { slug: string }) {
  const [content, setContent] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/page/${slug}/content`)
      .then((r) => r.json())
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => setContent(defaultContent));
  }, [slug]);

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
