import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useBusiness } from '../context/BusinessContext';
import { useToast } from '../components/Toast';
import Layout from '../components/Layout';
import { PageSkeleton } from '../components/Skeleton';

function getDisplayStatus(business: NonNullable<ReturnType<typeof useBusiness>['business']>) {
  if (business.subscriptionStatus === 'active') return 'active';
  if (business.subscriptionStatus === 'cancelled') return 'cancelled';
  if (business.freeTrialEnabled && business.trialStartDate) {
    const trialEnd = business.trialStartDate.seconds * 1000 + business.trialDurationDays * 24 * 60 * 60 * 1000;
    if (Date.now() < trialEnd) return 'trial';
  }
  return 'inactive';
}

function daysRemaining(seconds: number, durationDays: number): number {
  const end = seconds * 1000 + durationDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const { business, loading, error } = useBusiness();
  const toast = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  if (loading) return <Layout><PageSkeleton /></Layout>;

  if (error || !business) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500 dark:text-red-400 text-sm">{error || 'Failed to load business data.'}</p>
        </div>
      </Layout>
    );
  }

  const status = getDisplayStatus(business);
  const pageUrl = `https://taplab.in/${business.slug}`;

  const statusConfig = {
    active: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      label: 'Active',
      sub: 'Your page is live.',
    },
    trial: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Free Trial',
      sub: business.trialStartDate
        ? `${daysRemaining(business.trialStartDate.seconds, business.trialDurationDays)} days remaining`
        : '',
    },
    cancelled: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Cancelled',
      sub: business.subscriptionEndsAt
        ? `Page live until ${formatDate(business.subscriptionEndsAt.seconds)}`
        : 'Your page will go offline soon.',
    },
    inactive: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      label: 'Inactive',
      sub: 'Your page is offline.',
    },
  }[status];

  const handleCopy = () => {
    navigator.clipboard.writeText(pageUrl);
    toast('Link copied to clipboard');
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${business.slug}-qr.svg`;
    a.click();
    toast('QR code downloaded');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Overview of your TapLab page</p>
        </div>

        {/* Payment failure banner */}
        {status === 'inactive' && business.razorpayPaymentLink && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Your page is offline — complete your payment to restore access.
              </p>
            </div>
            <a
              href={business.razorpayPaymentLink}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Pay Now
            </a>
          </div>
        )}

        {/* Subscription status */}
        <div className={`rounded-xl p-5 border ${statusConfig.bg} ${statusConfig.border}`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Subscription</p>
          <p className={`text-lg font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
          <p className={`text-sm mt-0.5 ${statusConfig.text} opacity-80`}>{statusConfig.sub}</p>
        </div>

        {/* Page URL */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Page URL</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pageUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#2087e6] hover:bg-[#13204d] text-white text-sm rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
          <a
            href={pageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#13204d] dark:text-[#a8b4d4] hover:underline mt-2 inline-block"
          >
            Open page →
          </a>
        </div>


        {/* QR Code */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col items-center gap-4">
          <p className="self-start text-sm font-medium text-gray-700 dark:text-gray-300">QR Code</p>
          <div ref={qrRef} className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={pageUrl} size={160} />
          </div>
          <button
            onClick={handleDownloadQR}
            className="text-sm text-[#13204d] dark:text-[#a8b4d4] hover:text-[#0e1836] dark:hover:text-[#c5cde6] font-medium transition-colors"
          >
            Download QR Code
          </button>
        </div>

      </div>
    </Layout>
  );
}