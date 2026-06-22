import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useRef } from 'react';
const ToastContext = createContext(() => { });
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);
    const addToast = useCallback((message, type = 'success') => {
        const id = ++counter.current;
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);
    return (_jsxs(ToastContext.Provider, { value: addToast, children: [children, _jsx("div", { className: "fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none", children: toasts.map(t => (_jsxs("div", { className: `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg shadow-black/10 text-sm font-medium pointer-events-auto animate-slide-in max-w-sm ${t.type === 'error' ? 'bg-red-600 text-white' :
                        t.type === 'info' ? 'bg-indigo-600 text-white' :
                            'bg-gray-900 dark:bg-white text-white dark:text-gray-900'}`, children: [t.type === 'success' && _jsx(CheckIcon, {}), t.type === 'error' && _jsx(XIcon, {}), t.type === 'info' && _jsx(InfoIcon, {}), _jsx("span", { children: t.message })] }, t.id))) })] }));
}
function CheckIcon() {
    return (_jsx("svg", { className: "w-4 h-4 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }));
}
function XIcon() {
    return (_jsx("svg", { className: "w-4 h-4 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }));
}
function InfoIcon() {
    return (_jsx("svg", { className: "w-4 h-4 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }));
}
