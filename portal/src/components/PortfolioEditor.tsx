import React from 'react';

interface PortfolioItem {
  title: string;
  category: string;
  description: string;
  year: string;
}

interface PortfolioEditorProps {
  value: string;
  onChange: (json: string) => void;
}

function isPortfolioData(parsed: unknown): parsed is PortfolioItem[] {
  return (
    Array.isArray(parsed) &&
    parsed.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'title' in item &&
        'category' in item &&
        'description' in item &&
        'year' in item
    )
  );
}

function emptyItem(): PortfolioItem {
  return { title: '', category: '', description: '', year: '' };
}

export default function PortfolioEditor({ value, onChange }: PortfolioEditorProps) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = null; }

  if (!isPortfolioData(parsed)) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  const items = parsed as PortfolioItem[];

  const update = (next: PortfolioItem[]) => onChange(JSON.stringify(next));

  const updateField = (idx: number, field: keyof PortfolioItem, val: string) => {
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
              Project {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Remove project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateField(idx, 'title', e.target.value)}
                  placeholder="Project title"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Category</label>
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => updateField(idx, 'category', e.target.value)}
                  placeholder="e.g. Branding, Web"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateField(idx, 'description', e.target.value)}
                placeholder="Short description of the project"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="w-28">
              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Year</label>
              <input
                type="text"
                value={item.year}
                onChange={(e) => updateField(idx, 'year', e.target.value)}
                placeholder="2024"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add project
      </button>
    </div>
  );
}
