import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import taplabLight from '../assets/taplab.png';
import taplabDark from '../assets/taplabdark.png';

export default function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { theme } = useTheme();

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!isDesktop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="text-center max-w-sm">
          <img
            src={theme === 'dark' ? taplabDark : taplabLight}
            alt="TapLab"
            className="h-10 w-auto mx-auto mb-6"
          />
          <div className="text-3xl mb-3">💻</div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Open on a laptop or desktop</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">The Dev Panel isn't designed for small screens.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
