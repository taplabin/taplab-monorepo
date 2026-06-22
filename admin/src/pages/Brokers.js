import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import BrokerCombobox from '../components/BrokerCombobox';
const inputClass = 'w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';
export default function Brokers() {
    const toast = useToast();
    const { data: brokers, isLoading, mutate } = useSWR('/api/admin/brokers', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.brokers;
    });
    const { data: businesses } = useSWR('/api/admin/business', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.businesses;
    });
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' });
    const [saving, setSaving] = useState(false);
    const pendingPayouts = useMemo(() => {
        if (!brokers || !businesses)
            return [];
        return brokers
            .map((broker) => {
            const outstanding = businesses
                .filter((b) => b.brokerId === broker.id && !b.commissionPaid && b.setupFee && b.commissionPercent)
                .reduce((sum, b) => sum + Math.round((b.commissionPercent / 100) * b.setupFee), 0);
            return { ...broker, outstanding };
        })
            .filter((b) => b.outstanding > 0);
    }, [brokers, businesses]);
    const filteredBrokers = useMemo(() => {
        if (!brokers)
            return [];
        const q = search.toLowerCase().trim();
        if (!q)
            return brokers;
        return brokers.filter((b) => b.name.toLowerCase().includes(q) || b.phone.includes(q) || b.email.toLowerCase().includes(q));
    }, [brokers, search]);
    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await adminFetch('/api/admin/brokers', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            const data = await res.json();
            toast(`Broker added — invite link: ${data.inviteLink}`);
            setForm({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' });
            setAdding(false);
            mutate();
        }
        catch (err) {
            toast(err.message || 'Failed to add broker', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Brokers" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Manage your broker and seller network" })] }), !adding && (_jsx("button", { onClick: () => setAdding(true), className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors", children: "Add Broker" }))] }), pendingPayouts.length > 0 && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-red-900 dark:text-red-300 mb-3", children: "Pending Payouts" }), _jsx("div", { className: "space-y-2", children: pendingPayouts.map((broker) => (_jsxs("div", { className: "flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-800/50", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: broker.name }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: broker.phone })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("p", { className: "text-sm font-semibold text-red-600 dark:text-red-400", children: ["\u20B9", broker.outstanding.toLocaleString('en-IN')] }), _jsx(Link, { to: `/broker/${broker.id}`, className: "text-xs text-indigo-600 dark:text-indigo-400 hover:underline", children: "View \u2192" })] })] }, broker.id))) })] })), adding && (_jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "New Broker" }), _jsxs("form", { onSubmit: handleAdd, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Name" }), _jsx("input", { type: "text", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true, placeholder: "Full name", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Phone" }), _jsx("input", { type: "tel", value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }), required: true, placeholder: "+91 98765 43210", className: inputClass })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Email ", _jsx("span", { className: "font-normal normal-case text-gray-400 dark:text-gray-500", children: "(optional)" })] }), _jsx("input", { type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "broker@email.com", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Bank Account Number" }), _jsx("input", { type: "text", value: form.bankAccountNumber, onChange: (e) => setForm({ ...form, bankAccountNumber: e.target.value }), placeholder: "123456789012", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "IFSC Code" }), _jsx("input", { type: "text", value: form.bankIfsc, onChange: (e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() }), placeholder: "HDFC0000001", className: inputClass })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["UPI ID ", _jsx("span", { className: "font-normal normal-case text-gray-400 dark:text-gray-500", children: "(optional)" })] }), _jsx("input", { type: "text", value: form.upiId, onChange: (e) => setForm({ ...form, upiId: e.target.value }), placeholder: "broker@upi", className: inputClass })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Referred By ", _jsx("span", { className: "font-normal normal-case text-gray-400 dark:text-gray-500", children: "(optional)" })] }), _jsx(BrokerCombobox, { brokers: brokers ?? [], value: form.referredBy, onChange: (id) => setForm({ ...form, referredBy: id }) })] }), _jsxs("div", { className: "flex gap-3 pt-1", children: [_jsx("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: saving ? 'Saving…' : 'Save Broker' }), _jsx("button", { type: "button", onClick: () => { setAdding(false); setForm({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' }); }, className: "px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors", children: "Cancel" })] })] })] })), !isLoading && brokers && brokers.length > 0 && (_jsxs("div", { className: "relative", children: [_jsx("svg", { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search brokers\u2026", className: "w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" })] })), _jsxs("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", children: [isLoading && (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "px-5 py-4 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" }), _jsx("div", { className: "h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" })] }, i))) })), !isLoading && (!brokers || brokers.length === 0) && (_jsxs("div", { className: "px-5 py-12 text-center", children: [_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No brokers added yet." }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "Add your first broker above." })] })), !isLoading && brokers && brokers.length > 0 && filteredBrokers.length === 0 && (_jsx("div", { className: "px-5 py-12 text-center", children: _jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: ["No brokers match \"", search, "\""] }) })), !isLoading && filteredBrokers.length > 0 && (_jsx("div", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: filteredBrokers.map((broker) => (_jsxs(Link, { to: `/broker/${broker.id}`, className: "flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: broker.name }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-0.5", children: [broker.phone, broker.email ? ` · ${broker.email}` : ''] })] }), _jsx("svg", { className: "w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 5l7 7-7 7" }) })] }, broker.id))) }))] })] }) }));
}
