import { useEffect, useRef, useState, useMemo } from 'react';
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

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Area / line chart ────────────────────────────────────────────────────────

interface AreaPoint { label: string; raw: number; }

function AreaLineChart({
  points,
  color,
  gradientId,
  xLabels,
  emptyMsg = 'No data yet.',
}: {
  points: AreaPoint[];
  color: string;
  gradientId: string;
  xLabels: { i: number; text: string }[];
  emptyMsg?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 400, H = 80, padTop = 4, padBottom = 2;
  const chartH = H - padTop - padBottom;
  const n = points.length;
  const maxY = Math.max(...points.map((p) => p.raw), 1);

  const svgPts = points.map((p, i) => ({
    ...p,
    svgX: n > 1 ? (i / (n - 1)) * W : W / 2,
    svgY: padTop + (1 - p.raw / maxY) * chartH,
  }));

  let linePath = `M ${svgPts[0].svgX},${svgPts[0].svgY}`;
  for (let i = 1; i < svgPts.length; i++) {
    const prev = svgPts[i - 1];
    const curr = svgPts[i];
    const cpX = (prev.svgX + curr.svgX) / 2;
    linePath += ` C ${cpX},${prev.svgY} ${cpX},${curr.svgY} ${curr.svgX},${curr.svgY}`;
  }
  const areaPath = `${linePath} L ${svgPts[n - 1].svgX},${H} L ${svgPts[0].svgX},${H} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHovered(Math.round(xFrac * (n - 1)));
  };

  const hovPt = hovered !== null ? svgPts[hovered] : null;
  const tooltipPct = hovered !== null ? Math.max(6, Math.min(94, (hovered / (n - 1)) * 100)) : 0;

  if (points.every((p) => p.raw === 0)) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{emptyMsg}</p>;
  }

  return (
    <div>
      <div className="relative pt-8">
        {hovPt && (
          <div
            className="absolute top-0.5 pointer-events-none z-10 -translate-x-1/2"
            style={{ left: `${tooltipPct}%` }}
          >
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap leading-snug">
              <div>{hovPt.label}</div>
              <div className="text-gray-400 dark:text-gray-500 font-normal">
                {hovPt.raw.toLocaleString('en-IN')} views
              </div>
            </div>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-28"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[33, 66].map((pct) => (
            <line
              key={pct}
              x1={0} y1={padTop + (pct / 100) * chartH}
              x2={W} y2={padTop + (pct / 100) * chartH}
              stroke="currentColor" strokeWidth="0.5"
              className="text-gray-100 dark:text-gray-800"
            />
          ))}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          {hovPt && (
            <>
              <line
                x1={hovPt.svgX} y1={padTop} x2={hovPt.svgX} y2={H}
                stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.45"
              />
              <circle cx={hovPt.svgX} cy={hovPt.svgY} r="3" fill={color} stroke="white" strokeWidth="1.5" />
            </>
          )}
          <rect
            x={0} y={0} width={W} height={H}
            fill="transparent"
            onMouseMove={handleMouseMove}
          />
        </svg>
      </div>
      <div className="relative h-4 mt-1">
        {xLabels.map(({ i, text }) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[9px] text-gray-400 dark:text-gray-600 whitespace-nowrap"
            style={{ left: `${(i / (n - 1)) * 100}%` }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Small vertical bar chart (DoW only) ─────────────────────────────────────

function SmallBarChart({ items, gradient }: { items: { label: string; views: number }[]; gradient: string }) {
  const maxV = Math.max(...items.map((i) => i.views), 1);
  return (
    <div className="relative h-16">
      <div className="flex gap-0.5 h-full">
        {items.map((item, i) => {
          const h = Math.max((item.views / maxV) * 100, item.views > 0 ? 4 : 0);
          return (
            <div key={i} className="flex-1 relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                  {item.label}: {item.views}
                </div>
              </div>
              <div
                style={{ height: `${h}%`, background: item.views > 0 ? gradient : undefined }}
                className="absolute bottom-0 left-0 right-0 rounded-t-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>;

  const r = 36;
  const C = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="currentColor" strokeWidth={14} className="text-gray-100 dark:text-gray-800" />
        {segments.map((seg, i) => {
          const segLen = (seg.value / total) * C;
          const offset = -cumulative;
          cumulative += segLen;
          return (
            <circle
              key={i}
              cx={50} cy={50} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${segLen} ${C}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="flex-1 space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-600">{seg.value.toLocaleString('en-IN')}</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 w-8 text-right">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar ───────────────────────────────────────────────────────────

function HorizBar({ label, views, maxViews, gradient = 'linear-gradient(to right, #2087e6, #63b3f7)' }: {
  label: string; views: number; maxViews: number; gradient?: string;
}) {
  const pct = Math.round((views / Math.max(maxViews, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[72%]">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200 flex-shrink-0 tabular-nums">
          {Number(views).toLocaleString('en-IN')}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: gradient }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

// ─── Toggle chip ──────────────────────────────────────────────────────────────

function ViewToggle({ pie, onToggle }: { pie: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#13204d] hover:text-[#13204d] transition-colors"
    >
      {pie ? 'List' : 'Pie'}
    </button>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function Insights({ data, total30, mobileViews, desktopViews, newVisitors, returningVisitors, dowData, hourData }: {
  data: AnalyticsData;
  total30: number;
  mobileViews: number;
  desktopViews: number;
  newVisitors: number;
  returningVisitors: number;
  dowData: { label: string; views: number }[];
  hourData: { hour: number; views: number }[];
}) {
  const insights: string[] = [];

  const topReferrer = (data.referrers ?? [])[0];
  if (topReferrer) {
    const label = topReferrer.referrer === 'direct' ? 'NFC tap / direct' : topReferrer.referrer;
    insights.push(`Top traffic source is ${label}.`);
  }

  const totalDevices = mobileViews + desktopViews;
  if (totalDevices > 0) {
    const mobilePct = Math.round((mobileViews / totalDevices) * 100);
    if (mobilePct >= 60) insights.push(`${mobilePct}% of visits are on mobile — ideal for NFC.`);
    else if (mobilePct <= 40) insights.push(`${100 - mobilePct}% of visits are on desktop.`);
    else insights.push(`Traffic is split between mobile (${mobilePct}%) and desktop.`);
  }

  const peakDay = dowData.reduce((a, b) => (b.views > a.views ? b : a), dowData[0]);
  if (peakDay?.views > 0) insights.push(`Busiest day is ${peakDay.label}.`);

  const peakHour = hourData.reduce((a, b) => (b.views > a.views ? b : a), hourData[0]);
  if (peakHour?.views > 0) insights.push(`Peak traffic at ${formatHourLabel(peakHour.hour)} IST.`);

  const visitorTotal = newVisitors + returningVisitors;
  if (visitorTotal > 0 && returningVisitors > 0) {
    const returnPct = Math.round((returningVisitors / visitorTotal) * 100);
    insights.push(`${returnPct}% of visitors are returning.`);
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-[#13204d]/5 dark:bg-[#13204d]/10 border border-[#13204d]/10 dark:border-[#13204d]/20 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-[#13204d] dark:text-[#a8b4d4] uppercase tracking-wide mb-2.5">Insights</p>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#13204d] dark:text-[#c5cde6]">
            <span className="text-[#13204d]/50 mt-0.5 flex-shrink-0">›</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { business, loading: bizLoading, error: bizError } = useBusiness();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [devicePie, setDevicePie]   = useState(true);
  const [visitorPie, setVisitorPie] = useState(true);
  const [langPie, setLangPie]       = useState(false);

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

  async function downloadCSV() {
    if (!business) return;
    setDownloading(true);
    try {
      const res = await portalFetch(`/api/portal/analytics/export?slug=${business.slug}`);
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taplab-${business.slug}-analytics.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user will notice the download didn't start
    } finally {
      setDownloading(false);
    }
  }

  const chart30d = useMemo(() => buildChartData(data?.views30d ?? []), [data?.views30d]);
  const dowData  = useMemo(() => buildDowData(data?.dowPattern ?? []),  [data?.dowPattern]);
  const hourData = useMemo(() => buildHourData(data?.hourPattern ?? []), [data?.hourPattern]);
  const total30  = useMemo(() => chart30d.reduce((s, d) => s + d.views, 0), [chart30d]);

  const newVisitors       = Number(data?.returnVisitors?.find((r) => r.visitor_type === 'new')?.views ?? 0);
  const returningVisitors = Number(data?.returnVisitors?.find((r) => r.visitor_type === 'returning')?.views ?? 0);
  const visitorTotal      = newVisitors + returningVisitors;
  const returnRateStr     = visitorTotal > 0 ? `${Math.round((returningVisitors / visitorTotal) * 100)}%` : '—';

  const mobileViews  = Number(data?.devices?.find((d) => d.device === 'mobile')?.views ?? 0);
  const desktopViews = Number(data?.devices?.find((d) => d.device === 'desktop')?.views ?? 0);

  const maxReferrerViews = Math.max(...(data?.referrers ?? []).map((r) => Number(r.views)), 1);

  const area30dPoints: AreaPoint[] = chart30d.map((d) => ({
    label: formatDateShort(d.date),
    raw: d.views,
  }));
  const area30dXLabels = [0, 9, 19, 29].map((i) => ({
    i,
    text: formatDateShort(chart30d[i]?.date ?? ''),
  }));

  const areaHourPoints: AreaPoint[] = hourData.map((h) => ({
    label: `${formatHourLabel(h.hour)} IST`,
    raw: h.views,
  }));
  const areaHourXLabels = [0, 6, 12, 18, 23].map((i) => ({
    i,
    text: formatHourLabel(i),
  }));

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

  if (!data?.available) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
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

  const deviceSegments = [
    { label: 'Mobile',  value: mobileViews,  color: '#2087e6' },
    { label: 'Desktop', value: desktopViews, color: '#06b6d4' },
  ].filter((s) => s.value > 0);

  const visitorSegments = [
    { label: 'New',       value: newVisitors,       color: '#2087e6' },
    { label: 'Returning', value: returningVisitors, color: '#10b981' },
  ].filter((s) => s.value > 0);

  const langColors = ['#2087e6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];
  const langSegments = (data.languages ?? []).map((r, i) => ({
    label: r.language,
    value: Number(r.views),
    color: langColors[i % langColors.length],
  }));
  const maxLangViews = Math.max(...langSegments.map((s) => s.value), 1);

  if (business.pageStatus === 'no_page') {
      return (
        <Layout>
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No page deployed yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                Your analytics will be visible here once page has been deployed.
              </p>
            </div>
          </div>
        </Layout>
      );
    }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">How your page is performing</p>
        </div>

        {/* ── Retention warning ────────────────────────────────────────────── */}
        {hasAnyData && (
          <div className="flex items-start justify-between gap-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-amber-500 text-base leading-none mt-0.5 flex-shrink-0">⚠</span>
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">90-day data retention</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                  Your analytics wil be only kept for 90 days. Download a CSV to archive before data expires.
                </p>
              </div>
            </div>
            <button
              onClick={downloadCSV}
              disabled={downloading}
              className="flex-shrink-0 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {downloading ? 'Downloading…' : 'Download CSV'}
            </button>
          </div>
        )}

        {/* ── Summary stats ───────────────────────────────────────────────── */}
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

        {/* ── Insights ────────────────────────────────────────────────────── */}
        {hasAnyData && (
          <Insights
            data={data}
            total30={total30}
            mobileViews={mobileViews}
            desktopViews={desktopViews}
            newVisitors={newVisitors}
            returningVisitors={returningVisitors}
            dowData={dowData}
            hourData={hourData}
          />
        )}

        {/* ── 30-day area chart ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Daily views — last 30 days
          </p>
          <AreaLineChart
            points={area30dPoints}
            color="#2087e6"
            gradientId="area-grad-30d"
            xLabels={area30dXLabels}
            emptyMsg="No views in this period yet."
          />
        </div>

        {/* ── Day of week + Peak hours ─────────────────────────────────────── */}
        {hasAnyData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Day of week</p>
              {dowData.every((d) => d.views === 0) ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>
              ) : (
                <div>
                  <SmallBarChart
                    items={dowData}
                    gradient="linear-gradient(to top, #1a6fc4, #2087e6)"
                  />
                  <div className="flex mt-1.5">
                    {dowData.map((d) => (
                      <div key={d.label} className="flex-1 text-center">
                        <span className="text-[9px] text-gray-400 dark:text-gray-600">{d.label.slice(0, 1)}</span>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const peak = dowData.reduce((a, b) => (b.views > a.views ? b : a), dowData[0]);
                    return peak.views > 0 ? (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                        Busiest on <span className="font-semibold text-gray-700 dark:text-gray-300">{peak.label}</span>
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                Peak hours <span className="font-normal normal-case">(IST)</span>
              </p>
              <AreaLineChart
                points={areaHourPoints}
                color="#06b6d4"
                gradientId="area-grad-24h"
                xLabels={areaHourXLabels}
                emptyMsg="No data yet."
              />
            </div>
          </div>
        )}

        {/* ── Traffic sources ──────────────────────────────────────────────── */}
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
                <div className="space-y-3">
                  {(data.utmCampaigns ?? []).map((row, i) => {
                    const maxUTM = Math.max(...(data.utmCampaigns ?? []).map((r) => Number(r.views)), 1);
                    return (
                      <HorizBar
                        key={i}
                        label={`${row.campaign}${row.source !== 'none' ? ` · ${row.source}` : ''}`}
                        views={Number(row.views)}
                        maxViews={maxUTM}
                        gradient="linear-gradient(to right, #d97706, #f59e0b)"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Devices + Visitors ───────────────────────────────────────────── */}
        {hasAnyData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Device</p>
                {deviceSegments.length > 0 && <ViewToggle pie={devicePie} onToggle={() => setDevicePie(!devicePie)} />}
              </div>
              {deviceSegments.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>
              ) : devicePie ? (
                <DonutChart segments={deviceSegments} />
              ) : (
                <div className="space-y-3">
                  {deviceSegments.map((s) => (
                    <HorizBar key={s.label} label={s.label} views={s.value} maxViews={mobileViews + desktopViews} gradient={`linear-gradient(to right, ${s.color}, ${s.color}99)`} />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Visitors</p>
                {visitorSegments.length > 0 && <ViewToggle pie={visitorPie} onToggle={() => setVisitorPie(!visitorPie)} />}
              </div>
              {visitorSegments.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No data yet.</p>
              ) : visitorPie ? (
                <DonutChart segments={visitorSegments} />
              ) : (
                <div className="space-y-3">
                  {visitorSegments.map((s) => (
                    <HorizBar key={s.label} label={s.label} views={s.value} maxViews={visitorTotal} gradient={`linear-gradient(to right, ${s.color}, ${s.color}99)`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Languages ────────────────────────────────────────────────────── */}
        {langSegments.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Languages — last 30 days</p>
              <ViewToggle pie={langPie} onToggle={() => setLangPie(!langPie)} />
            </div>
            {langPie ? (
              <DonutChart segments={langSegments} />
            ) : (
              <div className="space-y-3">
                {langSegments.map((s) => (
                  <HorizBar key={s.label} label={s.label} views={s.value} maxViews={maxLangViews} gradient={`linear-gradient(to right, ${s.color}, ${s.color}99)`} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}