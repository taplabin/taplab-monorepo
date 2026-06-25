import React from 'react';

interface BrochureItem {
  heading: string;
  body: string;
  icon: string;
}

interface BrochureEditorProps {
  value: string;
  onChange: (json: string) => void;
}

function isBrochureData(parsed: unknown): parsed is BrochureItem[] {
  return (
    Array.isArray(parsed) &&
    parsed.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'heading' in item &&
        'body' in item &&
        'icon' in item
    )
  );
}

function emptyItem(): BrochureItem {
  return { heading: '', body: '', icon: '' };
}

export default function BrochureEditor({ value, onChange }: BrochureEditorProps) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = null; }

  if (!isBrochureData(parsed)) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
      />
    );
  }

  const items = parsed as BrochureItem[];

  const update = (next: BrochureItem[]) => onChange(JSON.stringify(next));

  const updateField = (idx: number, field: keyof BrochureItem, val: string) => {
    const next = structuredClone(items);
    next[idx][field] = val;
    update(next);
  };

  const addItem = () => update([...items, emptyItem()]);

  const removeItem = (idx: number) => {
    const next = structuredClone(items);
    next.splice(idx, 1);
    update(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Feature {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Remove feature"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3 space-y-2.5">
            <div className="grid grid-cols-[3rem_1fr] gap-3 items-start">
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Icon</label>
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => updateField(idx, 'icon', e.target.value)}
                  placeholder="✦"
                  maxLength={4}
                  className="w-full px-2.5 py-1.5 text-lg text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Heading</label>
                <input
                  type="text"
                  value={item.heading}
                  onChange={(e) => updateField(idx, 'heading', e.target.value)}
                  placeholder="Feature or service name"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Body</label>
              <input
                type="text"
                value={item.body}
                onChange={(e) => updateField(idx, 'body', e.target.value)}
                placeholder="One or two sentence description"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2087e6]"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-[#2087e6] dark:text-blue-400 hover:border-[#2087e6] dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add feature
      </button>
    </div>
  );
}
