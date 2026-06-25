import { useState, useRef, useEffect } from 'react';

export interface BrokerOption {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  brokers: BrokerOption[];
  value: string; // brokerId or ''
  onChange: (brokerId: string) => void;
}

export default function BrokerCombobox({ brokers, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = brokers.find((b) => b.id === value) ?? null;

  const filtered = query.trim() === ''
    ? brokers
    : brokers.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.phone.includes(query)
      );

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function select(broker: BrokerOption | null) {
    onChange(broker?.id ?? '');
    setQuery('');
    setOpen(false);
  }

  function handleBoxClick() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const controlClass = 'flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm transition-shadow cursor-text';

  return (
    <div ref={containerRef} className="relative">
      <div className={controlClass} onClick={handleBoxClick}>
        {selected && !open ? (
          <>
            <span className="flex-1 text-gray-900 dark:text-white">{selected.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); select(null); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              tabIndex={-1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected ? selected.name : 'Search by name or phone…'}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
          />
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                !value
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-[#2087e6] dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              None — direct deal
            </button>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500">No brokers match "{query}"</div>
            ) : (
              filtered.map((broker) => (
                <button
                  key={broker.id}
                  type="button"
                  onClick={() => select(broker)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    value === broker.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-[#2087e6] dark:text-blue-400'
                      : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="font-medium">{broker.name}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{broker.phone}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
