// Placeholder — overwritten by build service with developer's pasted App.tsx
import { useState, useEffect } from 'react';
import { defaultContent } from './content';

export default function App({ slug }: { slug: string }) {
  const [content, setContent] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`https://api.taplab.in/page/${slug}/content`)
      .then((r) => r.json())
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => setContent(defaultContent));
  }, [slug]);

  if (!content) return null;

  return <div>{content.heading}</div>;
}
