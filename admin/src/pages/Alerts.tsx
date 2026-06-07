import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

interface Business {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt?: { seconds: number } | null;
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pageStatus: 'no_page' | 'deployed';
  createdAt: { seconds: number };
}

function daysUntil(ms: number): number {
  return (ms - Date.now()) / 86400000;
}

function fmt(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function AlertRow({ slug, name, detail, link }: { slug: string; name: string; detail: string; link?: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{detail}</p>
      </div>
      <Link to={`/business/${slug}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex-shrink-0 ml-4">
        {link ?? 'View →'}
      </Link>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-5 space-y-2 ${color}`}>
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function Alerts() {
  const { data: businesses, isLoading } = useSWR('/api/admin/business', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.businesses as Business[];
  });

  if (isLoading || !businesses) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  const trialsExpiringSoon = businesses.filter((b) => {
    if (!b.freeTrialEnabled || !b.trialStartDate) return false;
    const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
    const d = daysUntil(trialEnd);
    return d > 0 && d <= 7;
  });

  const cancelledExpiringSoon = businesses.filter((b) => {
    if (b.subscriptionStatus !== 'cancelled' || !b.subscriptionEndsAt) return false;
    const d = daysUntil(b.subscriptionEndsAt.seconds * 1000);
    return d > 0 && d <= 7;
  });

  const inactive = businesses.filter((b) => {
    if (b.subscriptionStatus === 'active' || b.subscriptionStatus === 'cancelled') return false;
    if (b.freeTrialEnabled && b.trialStartDate) {
      const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
      if (Date.now() < trialEnd) return false;
    }
    return true;
  });

  const noPage = businesses.filter((b) => {
    if (b.pageStatus !== 'no_page') return false;
    const daysSinceCreated = (Date.now() - b.createdAt.seconds * 1000) / 86400000;
    return daysSinceCreated >= 14;
  });

  const totalAlerts = trialsExpiringSoon.length + cancelledExpiringSoon.length + inactive.length + noPage.length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Alerts</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {totalAlerts === 0 ? 'No alerts right now.' : `${totalAlerts} item${totalAlerts !== 1 ? 's' : ''} need attention.`}
          </p>
        </div>

        {totalAlerts === 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All clear</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No businesses need attention right now.</p>
          </div>
        )}

        {trialsExpiringSoon.length > 0 && (
          <Section
            title={`⏳ Trials expiring soon (${trialsExpiringSoon.length})`}
            color="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300"
          >
            {trialsExpiringSoon.map((b) => {
              const trialEnd = b.trialStartDate!.seconds * 1000 + b.trialDurationDays * 86400000;
              const d = Math.ceil(daysUntil(trialEnd));
              return (
                <AlertRow
                  key={b.businessSlug}
                  slug={b.businessSlug}
                  name={b.businessName}
                  detail={`Trial ends in ${d} day${d !== 1 ? 's' : ''} — ${fmt(b.trialStartDate!.seconds + b.trialDurationDays * 86400)}`}
                />
              );
            })}
          </Section>
        )}

        {cancelledExpiringSoon.length > 0 && (
          <Section
            title={`📴 Cancelled — page going offline soon (${cancelledExpiringSoon.length})`}
            color="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300"
          >
            {cancelledExpiringSoon.map((b) => {
              const d = Math.ceil(daysUntil(b.subscriptionEndsAt!.seconds * 1000));
              return (
                <AlertRow
                  key={b.businessSlug}
                  slug={b.businessSlug}
                  name={b.businessName}
                  detail={`Page goes offline in ${d} day${d !== 1 ? 's' : ''} — ${fmt(b.subscriptionEndsAt!.seconds)}`}
                />
              );
            })}
          </Section>
        )}

        {inactive.length > 0 && (
          <Section
            title={`💳 Inactive — payment needed (${inactive.length})`}
            color="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300"
          >
            {inactive.map((b) => (
              <AlertRow
                key={b.businessSlug}
                slug={b.businessSlug}
                name={b.businessName}
                detail="Page is offline — subscription not active"
              />
            ))}
          </Section>
        )}

        {noPage.length > 0 && (
          <Section
            title={`🏗️ No page deployed — 14+ days old (${noPage.length})`}
            color="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300"
          >
            {noPage.map((b) => {
              const days = Math.floor((Date.now() - b.createdAt.seconds * 1000) / 86400000);
              return (
                <AlertRow
                  key={b.businessSlug}
                  slug={b.businessSlug}
                  name={b.businessName}
                  detail={`Created ${days} days ago — no page deployed yet`}
                />
              );
            })}
          </Section>
        )}
      </div>
    </Layout>
  );
}
