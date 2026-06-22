import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export default function BrokerCombobox({ brokers, value, onChange }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const selected = brokers.find((b) => b.id === value) ?? null;
    const filtered = query.trim() === ''
        ? brokers
        : brokers.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()) ||
            b.phone.includes(query));
    useEffect(() => {
        function onMouseDown(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, []);
    function select(broker) {
        onChange(broker?.id ?? '');
        setQuery('');
        setOpen(false);
    }
    function handleBoxClick() {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }
    const controlClass = 'flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm transition-shadow cursor-text';
    return (_jsxs("div", { ref: containerRef, className: "relative", children: [_jsx("div", { className: controlClass, onClick: handleBoxClick, children: selected && !open ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "flex-1 text-gray-900 dark:text-white", children: selected.name }), _jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); select(null); }, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0", tabIndex: -1, children: _jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }) })] })) : (_jsx("input", { ref: inputRef, type: "text", value: query, onChange: (e) => { setQuery(e.target.value); setOpen(true); }, onFocus: () => setOpen(true), placeholder: selected ? selected.name : 'Search by name or phone…', className: "flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none" })) }), open && (_jsx("div", { className: "absolute z-30 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden", children: _jsxs("div", { className: "max-h-56 overflow-y-auto", children: [_jsx("button", { type: "button", onClick: () => select(null), className: `w-full text-left px-3 py-2.5 text-sm transition-colors ${!value
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`, children: "None \u2014 direct deal" }), _jsx("div", { className: "border-t border-gray-100 dark:border-gray-800" }), filtered.length === 0 ? (_jsxs("div", { className: "px-3 py-3 text-sm text-gray-400 dark:text-gray-500", children: ["No brokers match \"", query, "\""] })) : (filtered.map((broker) => (_jsxs("button", { type: "button", onClick: () => select(broker), className: `w-full text-left px-3 py-2.5 text-sm transition-colors ${value === broker.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`, children: [_jsx("span", { className: "font-medium", children: broker.name }), _jsx("span", { className: "ml-2 text-xs text-gray-400 dark:text-gray-500", children: broker.phone })] }, broker.id))))] }) }))] }));
}
