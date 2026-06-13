import { useState } from 'react';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface ScanResult {
  totalFiles: number;
  activeCount: number;
  orphanCount: number;
  orphans: string[];
}

type State =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'scanned'; result: ScanResult }
  | { phase: 'deleting'; result: ScanResult }
  | { phase: 'done'; deleted: number }
  | { phase: 'error'; message: string };

export default function Storage() {
  const toast = useToast();
  const [state, setState] = useState<State>({ phase: 'idle' });

  async function handleScan() {
    setState({ phase: 'scanning' });
    try {
      const res = await adminFetch('/api/admin/storage/orphans');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setState({ phase: 'scanned', result: data });
    } catch (err: any) {
      setState({ phase: 'error', message: err.message });
    }
  }

  async function handleDelete(result: ScanResult) {
    setState({ phase: 'deleting', result });
    try {
      const res = await adminFetch('/api/admin/storage/orphans', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setState({ phase: 'done', deleted: data.deleted });
      toast(`Deleted ${data.deleted} orphaned file${data.deleted !== 1 ? 's' : ''}`);
    } catch (err: any) {
      setState({ phase: 'error', message: err.message });
    }
  }

  const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6';

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Storage</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Clean up orphaned page bundles from the R2 bucket
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Page Bundle Cleanup</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 leading-relaxed">
            Every time a page is rebuilt, Vite generates a new hashed filename. Old versions
            stay in the bucket unused. This tool scans the bucket, compares against the current
            <code className="mx-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px]">pageVersion</code>
            of every business in Firestore, and deletes anything that doesn't match.
          </p>

          {/* Idle */}
          {state.phase === 'idle' && (
            <button
              onClick={handleScan}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Scan bucket
            </button>
          )}

          {/* Scanning */}
          {state.phase === 'scanning' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin flex-shrink-0" />
              Scanning R2 bucket and Firestore…
            </div>
          )}

          {/* Scanned — show results */}
          {(state.phase === 'scanned' || state.phase === 'deleting') && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total files', value: state.result.totalFiles },
                  { label: 'Active', value: state.result.activeCount },
                  { label: 'Orphaned', value: state.result.orphanCount, highlight: state.result.orphanCount > 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {state.result.orphanCount === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Bucket is clean — no orphaned files found.
                </p>
              ) : (
                <>
                  {/* Orphan file list */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Files to delete
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                      {state.result.orphans.map((file) => (
                        <div key={file} className="px-4 py-2.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDelete(state.result)}
                      disabled={state.phase === 'deleting'}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {state.phase === 'deleting' && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      )}
                      {state.phase === 'deleting'
                        ? 'Deleting…'
                        : `Delete ${state.result.orphanCount} file${state.result.orphanCount !== 1 ? 's' : ''}`}
                    </button>
                    <button
                      onClick={() => setState({ phase: 'idle' })}
                      disabled={state.phase === 'deleting'}
                      className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Done */}
          {state.phase === 'done' && (
            <div className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Done — deleted {state.deleted} file{state.deleted !== 1 ? 's' : ''}.
              </p>
              <button
                onClick={() => setState({ phase: 'idle' })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Scan again
              </button>
            </div>
          )}

          {/* Error */}
          {state.phase === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
              <button
                onClick={() => setState({ phase: 'idle' })}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
