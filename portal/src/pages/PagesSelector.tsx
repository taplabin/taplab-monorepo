import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useBusiness, BusinessSummary } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';

type DisplayStatus = 'active' | 'trial' | 'cancelled' | 'inactive';

function getDisplayStatus(b: BusinessSummary): DisplayStatus {
  if (b.subscriptionStatus === 'active') return 'active';
  if (b.subscriptionStatus === 'cancelled') return 'cancelled';
  if (b.freeTrialEnabled && b.trialStartDate) {
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
    if (Date.now() < trialEnd) return 'trial';
  }
  return 'inactive';
}

const STATUS_LABEL: Record<DisplayStatus, string> = {
  active:    'Active',
  trial:     'Free Trial',
  cancelled: 'Cancelled',
  inactive:  'Inactive',
};

const STATUS_COLOR: Record<DisplayStatus, string> = {
  active:    'bg-green-500',
  trial:     'bg-blue-500',
  cancelled: 'bg-yellow-500',
  inactive:  'bg-red-400',
};

const STATUS_TEXT: Record<DisplayStatus, string> = {
  active:    'text-green-700 dark:text-green-400',
  trial:     'text-blue-700 dark:text-blue-400',
  cancelled: 'text-yellow-700 dark:text-yellow-400',
  inactive:  'text-red-600 dark:text-red-400',
};

function PagePreview({ slug, name }: { slug: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    setScale(containerRef.current.offsetWidth / 390);
  }, []);

  const iframeH = Math.ceil(192 / scale);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ height: 192 }}>
      {/* Shimmer until iframe loads */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-750" />
      )}
      <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, width: 390, pointerEvents: 'none' }}>
        <iframe
          src={`https://taplab.in/${slug}`}
          width={390}
          height={iframeH}
          scrolling="no"
          loading="lazy"
          title={name}
          onLoad={() => setLoaded(true)}
          style={{ display: 'block', border: 'none' }}
        />
      </div>
    </div>
  );
}

function PageCard({
  business,
  isSelected,
  onSelect,
}: {
  business: BusinessSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = getDisplayStatus(business);

  return (
    <button
      onClick={onSelect}
      className={`group text-left w-full rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
          : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg'
      } bg-white dark:bg-gray-900`}
    >
      {/* Preview */}
      <div className="relative">
        {business.pageStatus === 'deployed' ? (
          <PagePreview slug={business.slug} name={business.businessName} />
        ) : (
          <div className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ height: 192 }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {business.businessName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">No page deployed yet</p>
            </div>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full z-10">
            Selected
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate transition-colors ${
            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
          }`}>
            {business.businessName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">
            /{business.slug}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`} />
          <span className={`text-xs font-medium ${STATUS_TEXT[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function PagesSelector() {
  const { businesses, selectedSlug, selectBusiness, business } = useBusiness();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSelect = (slug: string) => {
    selectBusiness(slug);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-indigo-600 tracking-tight">TapLab</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Pages</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {businesses.length === 1
              ? 'You have 1 TapLab page.'
              : `You have ${businesses.length} TapLab pages. Choose one to manage.`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map((biz) => (
            <PageCard
              key={biz.slug}
              business={biz}
              isSelected={biz.slug === selectedSlug}
              onSelect={() => handleSelect(biz.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
