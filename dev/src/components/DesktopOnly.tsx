import { useState, useEffect } from 'react';

export default function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!isDesktop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">💻</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Open on a laptop or desktop</h1>
          <p className="text-sm text-gray-500">The Dev Panel isn't designed for small screens.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
