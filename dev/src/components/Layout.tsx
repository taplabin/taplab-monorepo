import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">TapLab</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">Dev Panel</span>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
