import { useState } from 'react';

const PLATFORMS = [
  { id: 'instagram',   label: 'Instagram' },
  { id: 'facebook',    label: 'Facebook' },
  { id: 'whatsapp',    label: 'WhatsApp' },
  { id: 'youtube',     label: 'YouTube' },
  { id: 'twitter',     label: 'X / Twitter' },
  { id: 'linkedin',    label: 'LinkedIn' },
  { id: 'zomato',      label: 'Zomato' },
  { id: 'swiggy',      label: 'Swiggy' },
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'website',     label: 'Website' },
] as const;

type PlatformId = typeof PLATFORMS[number]['id'];

interface Handle { platform: PlatformId; url: string; }
interface SocialData { style: 'mono' | 'brand'; handles: Handle[]; }

function parseSocialData(value: string): SocialData {
  try {
    const p = JSON.parse(value);
    if (p && Array.isArray(p.handles)) return p as SocialData;
  } catch {}
  return { style: 'brand', handles: [] };
}

function PlatformIcon({ id, size = 15 }: { id: string; size?: number }) {
  const s = size;
  switch (id) {
    case 'instagram':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>;
    case 'facebook':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
    case 'whatsapp':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>;
    case 'youtube':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
    case 'twitter':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'linkedin':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'zomato':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4 7H8v2h5.586l-6.293 6.293 1.414 1.414L15 10.414V16h2V7h-1z"/></svg>;
    case 'swiggy':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>;
    case 'google_maps':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
    case 'website':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

const inputClass = 'flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2087e6]';

export default function SocialEditor({ value, onChange }: { value: string; onChange: (json: string) => void }) {
  const data = parseSocialData(value);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (next: SocialData) => onChange(JSON.stringify(next));

  const setStyle = (style: 'mono' | 'brand') => update({ ...data, style });

  const addHandle = (platform: PlatformId) => {
    update({ ...data, handles: [...data.handles, { platform, url: '' }] });
    setPickerOpen(false);
  };

  const updateUrl = (idx: number, url: string) => {
    const handles = data.handles.map((h, i) => i === idx ? { ...h, url } : h);
    update({ ...data, handles });
  };

  const removeHandle = (idx: number) => {
    update({ ...data, handles: data.handles.filter((_, i) => i !== idx) });
  };

  const usedPlatforms = new Set(data.handles.map(h => h.platform));
  const availablePlatforms = PLATFORMS.filter(p => !usedPlatforms.has(p.id));

  return (
    <div className="space-y-4">

      {/* Style toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Icon style</span>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['mono', 'brand'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  data.style === s
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {s === 'mono' ? 'Monochrome' : 'Brand Colors'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {data.style === 'mono' ? 'All icons match the page colour' : 'Each icon uses its platform colour'}
        </p>
      </div>

      {/* Handles list */}
      {data.handles.length > 0 && (
        <div className="space-y-2">
          {data.handles.map((handle, idx) => {
            const platform = PLATFORMS.find(p => p.id === handle.platform);
            return (
              <div key={idx} className="flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                  <PlatformIcon id={handle.platform} size={15} />
                </span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-24 flex-shrink-0">
                  {platform?.label}
                </span>
                <input
                  type="url"
                  value={handle.url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeHandle(idx)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add handle picker */}
      {availablePlatforms.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-[#2087e6] dark:text-blue-400 hover:border-[#2087e6] dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add handle
          </button>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => setPickerOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                {availablePlatforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addHandle(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <span className="text-gray-400 dark:text-gray-500">
                      <PlatformIcon id={p.id} size={14} />
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
