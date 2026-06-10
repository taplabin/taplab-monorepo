import { useEffect, useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import { PageSkeleton } from '../components/Skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  available: boolean;
  views30d?:       { date: string; views: number }[];
  referrers?:      { referrer: string; views: number }[];
  devices?:        { device: string; views: number }[];
  viewsThisMonth?: number;
  avgDuration?:    number;
  totalSessions?:  number;
  returnVisitors?: { visitor_type: string; views: number }[];
  dowPattern?:     { dow: number; views: number }[];
  hourPattern?:    { hour: number; views: number }[];
  languages?:      { language: string; views: number }[];
  utmCampaigns?:   { campaign: string; source: string; views: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChartData(views30d: { date: string; views: number }[]) {
  const byDate: Record<string, number> = {};
  for (const row of views30d) byDate[row.date] = Number(row.views);
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    result.push({ date, views: byDate[date] ?? 0 });
  }
  return result;
}

function buildDowData(rows: { dow: number; views: number }[]) {
  const byDow: Record<number, number> = {};
  for (const r of rows) byDow[Number(r.dow)] = Number(r.views);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => ({ label, views: byDow[i + 1] ?? 0 }));
}

function buildHourData(rows: { hour: number; views: number }[]) {
  // UTC → IST (+5:30 = +5.5 hours)
  const byIST: Record<number, number> = {};
  for (const r of rows) {
    const istHour = Math.floor((Number(r.hour) + 5.5) % 24);
    byIST[istHour] = (byIST[istHour] ?? 0) + Number(r.views);
  }
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, views: byIST[i] ?? 0 }));
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart30({ data }: { data: { date: string; views: number }[] }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const labelIdx = new Set([0, 9, 19, 29]);
  return (
    <div>
      <div className="flex gap-px h-24">
        {data.map((day) => (
          <div key={day.date} className="flex-1 relative group">
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap">
                {Number(day.views).toLocaleString('en-IN')}
              </div>
              <div className="w-1.5 h-1.5 bg-gray-900 dark:bg-gray-100 rotate-45 -mt-0.5" />
            </div>
            <div
              style={{ height: `${Math.max((day.views / maxViews) * 100, day.views > 0 ? 3 : 0)}%` }}
              className="absolute bottom-0 left-0 right-0 bg-indigo-500 dark:bg-indigo-400 rounded-t-sm group-hover:bg-indigo-400 dark:group-hover:bg-indigo-300 transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="flex mt-1.5">
        {data.map((day, i) => (
          <div key={day.date} className="flex-1 text-center">
            {labelIdx.has(i) && (
              <span className="text-[9px] text-gray-400 dark:text-gray-600">
                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallBarChart({ data, labelKey, viewsKey, labelFn }: {
  data: Record<string, unknown>[];
  labelKey: string;
  viewsKey: string;
  labelFn?: (v: unknown) => string;
}) {
  const items = data.map((r) => ({ label: r[labelKey], views: Number(r[viewsKey]) }));
  const maxV = Math.max(...items.map((i) => i.views), 1);
  return (
    <div className="flex gap-0.5 h-16">
      {items.map((item, i) => (
        <div key={i} className="flex-1 relative group">
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
              {labelFn ? labelFn(item.label) : String(item.label)}: {item.views.toLocaleString('en-IN')}
            </div>
          </div>
          <div
            style={{ height: `${Math.max((item.views / maxV) * 100, item.views > 0 ? 4 : 0)}%` }}
            className="absolute bottom-0 left-0 right-0 bg-indigo-500 dark:bg-indigo-400 rounded-t-sm"
          />
        </div>
      ))}
    </div>
  );
}

function HorizBar({ label, views, maxViews, color = 'bg-indigo-400 dark:bg-indigo-500' }: {
  label: string; views: number; maxViews: number; color?: string;
}) {
  const pct = Math.round((views / Math.max(maxViews, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[72%]">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200 flex-shrink-0 tabular-nums">
          {Number(views).toLocaleString('en-IN')}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%` }} className={`h-full ${color} rounded-full`} />
      </div>
    </div>
  );
}

function SplitBar({ aLabel, aViews, bLabel, bViews, aColor, bColor }: {
  aLabel: string; aViews: number; bLabel: string; bViews: number;
  aColor: string; bColor: string;
}) {
  const total = aViews + bViews;
  if (total === 0) return <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>;
  const aPct = Math.round((aViews / total) * 100);
  const bPct = 100 - aPct;
  return (
    <div className="space-y-3">
      {[{ label: aLabel, views: aViews, pct: aPct, color: aColor },
        { label: bLabel, views: bViews, pct: bPct, color: bColor }].map(({ label, views, pct, color }) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div style={{ width: `${pct}%` }} className={`h-full ${color} rounded-full`} />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
            {Number(views).toLocaleString('en-IN')} visits
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { business, loading: bizLoading, error: bizError } = useBusiness();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!business) return;
    setLoading(true);
    setError('');
    portalFetch(`/api/portal/analytics?slug=${business.slug}`)
      .then((r) => r.json())
      .then((d: AnalyticsData) => setData(d))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [business]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const chart30d    = useMemo(() => buildChartData(data?.views30d ?? []), [data?.views30d]);
  const dowData     = useMemo(() => buildDowData(data?.dowPattern ?? []),  [data?.dowPattern]);
  const hourData    = useMemo(() => buildHourData(data?.hourPattern ?? []), [data?.hourPattern]);
  const total30     = useMemo(() => chart30d.reduce((s, d) => s + d.views, 0), [chart30d]);

  const newVisitors       = Number(data?.returnVisitors?.find((r) => r.visitor_type === 'new')?.views ?? 0);
  const returningVisitors = Number(data?.returnVisitors?.find((r) => r.visitor_type === 'returning')?.views ?? 0);
  const visitorTotal      = newVisitors + returningVisitors;
  const returnRateStr     = visitorTotal > 0
    ? `${Math.round((returningVisitors / visitorTotal) * 100)}%`
    : '—';

  const mobileViews  = Number(data?.devices?.find((d) => d.device === 'mobile')?.views ?? 0);
  const desktopViews = Number(data?.devices?.find((d) => d.device === 'desktop')?.views ?? 0);

  const maxReferrerViews = Math.max(...(data?.referrers ?? []).map((r) => Number(r.views)), 1);

  // ── Loading / error states ────────────────────────────────────────────────
  if (bizLoading || loading) return <Layout><PageSkeleton /></Layout>;

  if (bizError || !business) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500 dark:text-red-400 text-sm">{bizError || 'Failed to load.'}</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        </div>
      </Layout>
    );
  }

  // CF not wired up yet
  if (!data?.available) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analytics coming soon</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
              Data will appear here once your page starts receiving visits.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const hasAnyData = total30 > 0 || (data.totalSessions ?? 0) > 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
        </div>

        {/* ── Summary stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="This month"
            value={(data.viewsThisMonth ?? 0).toLocaleString('en-IN')}
            sub="views"
          />
          <StatCard
            label="Last 30 days"
            value={total30.toLocaleString('en-IN')}
            sub="views"
          />
          <StatCard
            label="Avg session"
            value={formatDuration(data.avgDuration ?? 0)}
            sub={data.totalSessions ? `${data.totalSessions.toLocaleString('en-IN')} sessions` : undefined}
          />
          <StatCard
            label="Return rate"
            value={returnRateStr}
            sub={visitorTotal > 0 ? `${returningVisitors.toLocaleString('en-IN')} returning` : undefined}
          />
        </div>

        {/* ── 30-day bar chart ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Daily views — last 30 days</p>
          {total30 === 0 ? (
            <div className="h-24 flex items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No views in this period yet.</p>
            </div>
          ) : (
            <BarChart30 data={chart30d} />
          )}
        </div>

        {/* ── When they visit: day of week + peak hours ──────────────────── */}
        {hasAnyData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Day of week */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Day of week</p>
              {dowData.every((d) => d.views === 0) ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>
              ) : (
                <div>
                  <SmallBarChart
                    data={dowData}
                    labelKey="label"
                    viewsKey="views"
                  />
                  <div className="flex mt-1">
                    {dowData.map((d) => (
                      <div key={d.label} className="flex-1 text-center">
                        <span className="text-[9px] text-gray-400 dark:text-gray-600">{d.label.slice(0, 1)}</span>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const peak = dowData.reduce((a, b) => b.views > a.views ? b : a, dowData[0]);
                    return peak.views > 0 ? (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                        Busiest on <span className="font-medium text-gray-700 dark:text-gray-300">{peak.label}</span>
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Peak hours */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Peak hours <span className="font-normal normal-case">(IST)</span></p>
              {hourData.every((d) => d.views === 0) ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>
              ) : (
                <div>
                  <div className="flex gap-px h-16">
                    {hourData.map((h) => {
                      const maxH = Math.max(...hourData.map((x) => x.views), 1);
                      return (
                        <div key={h.hour} className="flex-1 relative group">
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[9px] px-1 py-0.5 rounded whitespace-nowrap">
                              {formatHourLabel(h.hour)}: {h.views}
                            </div>
                          </div>
                          <div
                            style={{ height: `${Math.max((h.views / maxH) * 100, h.views > 0 ? 4 : 0)}%` }}
                            className="absolute bottom-0 left-0 right-0 bg-purple-400 dark:bg-purple-500 rounded-t-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex mt-1">
                    {hourData.map((h) => (
                      <div key={h.hour} className="flex-1 text-center">
                        {[0, 6, 12, 18].includes(h.hour) && (
                          <span className="text-[8px] text-gray-400 dark:text-gray-600">{formatHourLabel(h.hour)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const peak = hourData.reduce((a, b) => b.views > a.views ? b : a, hourData[0]);
                    return peak.views > 0 ? (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                        Peak at <span className="font-medium text-gray-700 dark:text-gray-300">{formatHourLabel(peak.hour)}</span>
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Traffic sources (referrers + UTMs) ────────────────────────── */}
        {((data.referrers?.length ?? 0) > 0 || (data.utmCampaigns?.length ?? 0) > 0) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Traffic sources — last 30 days</p>
            <div className="space-y-3">
              {(data.referrers ?? []).map((row) => (
                <HorizBar
                  key={row.referrer}
                  label={row.referrer === 'direct' ? 'Direct / NFC tap' : row.referrer}
                  views={Number(row.views)}
                  maxViews={maxReferrerViews}
                />
              ))}
            </div>

            {(data.utmCampaigns?.length ?? 0) > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">UTM campaigns</p>
                <div className="space-y-2">
                  {(data.utmCampaigns ?? []).map((row, i) => {
                    const maxUTM = Math.max(...(data.utmCampaigns ?? []).map((r) => Number(r.views)), 1);
                    return (
                      <HorizBar
                        key={i}
                        label={`${row.campaign}${row.source !== 'none' ? ` · ${row.source}` : ''}`}
                        views={Number(row.views)}
                        maxViews={maxUTM}
                        color="bg-amber-400 dark:bg-amber-500"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Audience: device split + return vs new ─────────────────────── */}
        {hasAnyData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Device split */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Device</p>
              <SplitBar
                aLabel="Mobile"
                aViews={mobileViews}
                bLabel="Desktop"
                bViews={desktopViews}
                aColor="bg-indigo-500 dark:bg-indigo-400"
                bColor="bg-purple-400 dark:bg-purple-500"
              />
            </div>

            {/* New vs returning */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Visitors</p>
              <SplitBar
                aLabel="New"
                aViews={newVisitors}
                bLabel="Returning"
                bViews={returningVisitors}
                aColor="bg-indigo-500 dark:bg-indigo-400"
                bColor="bg-emerald-400 dark:bg-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ── Language distribution ─────────────────────────────────────── */}
        {(data.languages?.length ?? 0) > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Languages — last 30 days</p>
            <div className="space-y-3">
              {(data.languages ?? []).map((row) => {
                const maxL = Math.max(...(data.languages ?? []).map((r) => Number(r.views)), 1);
                return (
                  <HorizBar
                    key={row.language}
                    label={row.language}
                    views={Number(row.views)}
                    maxViews={maxL}
                    color="bg-sky-400 dark:bg-sky-500"
                  />
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
