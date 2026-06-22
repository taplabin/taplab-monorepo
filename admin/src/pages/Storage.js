import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
export default function Storage() {
    const toast = useToast();
    const [state, setState] = useState({ phase: 'idle' });
    async function handleScan() {
        setState({ phase: 'scanning' });
        try {
            const res = await adminFetch('/api/admin/storage/orphans');
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Scan failed');
            setState({ phase: 'scanned', result: data });
        }
        catch (err) {
            setState({ phase: 'error', message: err.message });
        }
    }
    async function handleDelete(result) {
        setState({ phase: 'deleting', result });
        try {
            const res = await adminFetch('/api/admin/storage/orphans', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Delete failed');
            setState({ phase: 'done', deleted: data.deleted });
            toast(`Deleted ${data.deleted} orphaned file${data.deleted !== 1 ? 's' : ''}`);
        }
        catch (err) {
            setState({ phase: 'error', message: err.message });
        }
    }
    const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6';
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Storage" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Clean up orphaned page bundles from the R2 bucket" })] }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-1", children: "Page Bundle Cleanup" }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-5 leading-relaxed", children: ["Every time a page is rebuilt, Vite generates a new hashed filename. Old versions stay in the bucket unused. This tool scans the bucket, compares against the current", _jsx("code", { className: "mx-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px]", children: "pageVersion" }), "of every business in Firestore, and deletes anything that doesn't match."] }), state.phase === 'idle' && (_jsx("button", { onClick: handleScan, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors", children: "Scan bucket" })), state.phase === 'scanning' && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400", children: [_jsx("div", { className: "w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin flex-shrink-0" }), "Scanning R2 bucket and Firestore\u2026"] })), (state.phase === 'scanned' || state.phase === 'deleting') && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-3 gap-3", children: [
                                        { label: 'Total files', value: state.result.totalFiles },
                                        { label: 'Active', value: state.result.activeCount },
                                        { label: 'Orphaned', value: state.result.orphanCount, highlight: state.result.orphanCount > 0 },
                                    ].map(({ label, value, highlight }) => (_jsxs("div", { className: "bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3", children: [_jsx("p", { className: "text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide", children: label }), _jsx("p", { className: `text-xl font-bold mt-0.5 ${highlight ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`, children: value })] }, label))) }), state.result.orphanCount === 0 ? (_jsx("p", { className: "text-sm text-green-600 dark:text-green-400 font-medium", children: "Bucket is clean \u2014 no orphaned files found." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden", children: [_jsx("div", { className: "px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50", children: _jsx("p", { className: "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide", children: "Files to delete" }) }), _jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto", children: state.result.orphans.map((file) => (_jsxs("div", { className: "px-4 py-2.5 flex items-center gap-2", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" }), _jsx("span", { className: "text-xs font-mono text-gray-600 dark:text-gray-400", children: file })] }, file))) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => handleDelete(state.result), disabled: state.phase === 'deleting', className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2", children: [state.phase === 'deleting' && (_jsx("div", { className: "w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" })), state.phase === 'deleting'
                                                            ? 'Deleting…'
                                                            : `Delete ${state.result.orphanCount} file${state.result.orphanCount !== 1 ? 's' : ''}`] }), _jsx("button", { onClick: () => setState({ phase: 'idle' }), disabled: state.phase === 'deleting', className: "px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors", children: "Cancel" })] })] }))] })), state.phase === 'done' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-green-600 dark:text-green-400 font-medium", children: ["Done \u2014 deleted ", state.deleted, " file", state.deleted !== 1 ? 's' : '', "."] }), _jsx("button", { onClick: () => setState({ phase: 'idle' }), className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors", children: "Scan again" })] })), state.phase === 'error' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-red-600 dark:text-red-400", children: state.message }), _jsx("button", { onClick: () => setState({ phase: 'idle' }), className: "px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors", children: "Try again" })] }))] })] }) }));
}
