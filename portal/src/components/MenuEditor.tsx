import React from 'react';

interface MenuItem {
  name: string;
  price: string;
  description: string;
  veg: boolean;
}

interface MenuCategory {
  label: string;
  priceNote?: string;
  items: MenuItem[];
}

type MenuData = Record<string, MenuCategory>;

interface MenuEditorProps {
  value: string;
  onChange: (json: string) => void;
}

function isMenuData(parsed: unknown): parsed is MenuData {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.values(parsed as object).every(
      (v) => v && typeof v === 'object' && 'items' in v && Array.isArray((v as any).items)
    )
  );
}

function emptyItem(): MenuItem {
  return { name: '', price: '', description: '', veg: true };
}

export default function MenuEditor({ value, onChange }: MenuEditorProps) {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = null; }

  if (!isMenuData(parsed)) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  const menu = parsed as MenuData;

  const update = (newMenu: MenuData) => onChange(JSON.stringify(newMenu));

  const updateItem = (catKey: string, idx: number, field: keyof MenuItem, val: string | boolean) => {
    const next = structuredClone(menu);
    (next[catKey].items[idx] as any)[field] = val;
    update(next);
  };

  const addItem = (catKey: string) => {
    const next = structuredClone(menu);
    next[catKey].items.push(emptyItem());
    update(next);
  };

  const removeItem = (catKey: string, idx: number) => {
    const next = structuredClone(menu);
    next[catKey].items.splice(idx, 1);
    update(next);
  };

  const updateCategoryLabel = (catKey: string, label: string) => {
    const next = structuredClone(menu);
    next[catKey].label = label;
    update(next);
  };

  const updatePriceNote = (catKey: string, note: string) => {
    const next = structuredClone(menu);
    next[catKey].priceNote = note || undefined;
    update(next);
  };

  return (
    <div className="space-y-6">
      {Object.entries(menu).map(([catKey, category]) => (
        <div key={catKey} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Category header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <input
                type="text"
                value={category.label}
                onChange={(e) => updateCategoryLabel(catKey, e.target.value)}
                className="w-full text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                placeholder="Category name"
              />
            </div>
            <input
              type="text"
              value={category.priceNote ?? ''}
              onChange={(e) => updatePriceNote(catKey, e.target.value)}
              placeholder="Price note (e.g. 4PC / 6PC)"
              className="text-xs text-gray-400 dark:text-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0 text-right w-36 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {category.items.map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex items-start gap-3">
                {/* Veg toggle */}
                <button
                  type="button"
                  onClick={() => updateItem(catKey, idx, 'veg', !item.veg)}
                  className="mt-1 flex-shrink-0"
                  title={item.veg ? 'Veg — click to toggle' : 'Non-veg — click to toggle'}
                >
                  <span className={`inline-block w-4 h-4 rounded-sm border-2 ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                    <span className={`block w-2 h-2 rounded-full m-0.5 ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </span>
                </button>

                {/* Item fields */}
                <div className="flex-1 grid grid-cols-1 gap-1.5">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(catKey, idx, 'name', e.target.value)}
                    placeholder="Item name"
                    className="text-sm font-medium text-gray-800 dark:text-gray-200 border-0 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 py-0.5 bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(catKey, idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="text-xs text-gray-500 dark:text-gray-400 border-0 border-b border-gray-100 dark:border-gray-700/50 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 py-0.5 bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>

                {/* Price */}
                <div className="w-20 flex-shrink-0">
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateItem(catKey, idx, 'price', e.target.value)}
                    placeholder="Price"
                    className="w-full text-sm text-right font-medium text-gray-700 dark:text-gray-300 border-0 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 py-0.5 bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeItem(catKey, idx)}
                  className="mt-0.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              onClick={() => addItem(catKey)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add item
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
