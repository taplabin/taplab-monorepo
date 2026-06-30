import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import taplabLight from '../assets/taplab.png';
import taplabDark from '../assets/taplabdark.png';

const STATUS_COLORS: Record<string, string> = {
  queued:          'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  claimed:         'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  in_review:       'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  approved:        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  publish_pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  live:            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  claimed: 'Claimed',
  in_review: 'In review',
  approved: 'Approved',
  publish_pending: 'Publish pending',
  live: 'Live',
};

interface TopBarProps {
  jobName?: string;
  jobStatus?: string;
}

export default function TopBar({ jobName, jobStatus }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-11 flex-shrink-0 flex items-center px-4 gap-3 bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2d2d2d] select-none">

      {/* Logo */}
      <NavLink to="/" className="flex-shrink-0 flex items-center">
        <img
          src={theme === 'dark' ? taplabDark : taplabLight}
          alt="TapLab"
          className="h-7 w-auto"
        />
      </NavLink>

      <Chevron />

      <NavLink
        to="/"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Queue
      </NavLink>

      {jobName && (
        <>
          <Chevron />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
            {jobName}
          </span>
          {jobStatus && STATUS_LABELS[jobStatus] && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[jobStatus] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABELS[jobStatus]}
            </span>
          )}
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>

      <button
        onClick={() => signOut(auth)}
        className="text-xs px-2.5 py-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Sign out
      </button>

    </header>
  );
}

function Chevron() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
