import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import taplabLight from '../assets/taplab.png';
import taplabDark from '../assets/taplabdark.png';

const activeClass = 'bg-blue-50 dark:bg-blue-500/10 text-[#2087e6] dark:text-blue-400';
const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

      {/* Sidebar */}
      <aside className="w-56 fixed inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">

        {/* Logo */}
        <div className="px-5 pt-3.5 pb-5 border-b border-gray-100 dark:border-gray-800">
          <NavLink to="/">
            <img
              src={theme === 'dark' ? taplabDark : taplabLight}
              alt="TapLab"
              className="h-10 w-auto"
            />
          </NavLink>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Dev Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? activeClass : inactiveClass}`
            }
          >
            <QueueIcon />
            Queue
          </NavLink>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${inactiveClass}`}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button
            onClick={() => signOut(auth)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${inactiveClass}`}
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>

      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56">
        {children}
      </div>

    </div>
  );
}

function QueueIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
