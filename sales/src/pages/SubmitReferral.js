import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';
const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
export default function SubmitReferral({ onSuccess, onCancel }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [saving, setSaving] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await brokerFetch('/api/broker/referrals', { method: 'POST', body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            toast('Referral submitted');
            onSuccess();
        }
        catch (err) {
            toast(err.message || 'Failed to submit', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Refer a Broker" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: "Know someone who would make a great TapLab sales partner? Send us their details." }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Full Name" }), _jsx("input", { required: true, type: "text", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Phone" }), _jsx("input", { required: true, type: "tel", value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }), className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Email" }), _jsx("input", { required: true, type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), className: inputClass })] }), _jsxs("div", { className: "flex gap-3 pt-1", children: [_jsx("button", { type: "submit", disabled: saving, className: "flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: saving ? 'Submitting…' : 'Submit Referral' }), _jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors", children: "Cancel" })] })] }));
}
