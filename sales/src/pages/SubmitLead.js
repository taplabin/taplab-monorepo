import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';
const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
export default function SubmitLead({ onSuccess, onCancel }) {
    const toast = useToast();
    const [form, setForm] = useState({
        businessName: '', businessSlug: '', ownerName: '', ownerPhone: '', ownerEmail: '',
        pricingAmount: 999, billingCycle: 'monthly',
        setupFee: 0, commissionPercent: 10, freeTrialEnabled: false, trialDurationDays: 7,
    });
    const [saving, setSaving] = useState(false);
    const handleSlug = (val) => setForm({ ...form, businessSlug: val.toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, '') });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await brokerFetch('/api/broker/leads', { method: 'POST', body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            toast('Lead submitted');
            onSuccess();
        }
        catch (err) {
            toast(err.message || 'Failed to submit', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "New Client Lead" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Business Name" }), _jsx("input", { required: true, type: "text", value: form.businessName, onChange: (e) => setForm({ ...form, businessName: e.target.value }), placeholder: "Pizza Palace", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Slug" }), _jsx("input", { required: true, type: "text", value: form.businessSlug, onChange: (e) => handleSlug(e.target.value), placeholder: "pizza_palace", className: inputClass }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: ["taplab.in/", form.businessSlug || 'slug'] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Owner Name" }), _jsx("input", { required: true, type: "text", value: form.ownerName, onChange: (e) => setForm({ ...form, ownerName: e.target.value }), className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Owner Phone" }), _jsx("input", { required: true, type: "tel", value: form.ownerPhone, onChange: (e) => setForm({ ...form, ownerPhone: e.target.value }), className: inputClass })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsxs("label", { className: labelClass, children: ["Owner Email ", _jsx("span", { className: "text-gray-400 dark:text-gray-500 font-normal text-xs", children: "(optional)" })] }), _jsx("input", { type: "email", value: form.ownerEmail, onChange: (e) => setForm({ ...form, ownerEmail: e.target.value }), className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Pricing (\u20B9/month or year)" }), _jsx("input", { required: true, type: "number", value: form.pricingAmount, onChange: (e) => setForm({ ...form, pricingAmount: parseInt(e.target.value) || 0 }), min: "1", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Billing Cycle" }), _jsxs("select", { value: form.billingCycle, onChange: (e) => setForm({ ...form, billingCycle: e.target.value }), className: inputClass, children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Setup Fee (\u20B9)" }), _jsx("input", { type: "number", value: form.setupFee, onChange: (e) => setForm({ ...form, setupFee: parseInt(e.target.value) || 0 }), min: "0", className: inputClass })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Commission %" }), _jsx("input", { required: true, type: "number", value: form.commissionPercent, onChange: (e) => setForm({ ...form, commissionPercent: parseFloat(e.target.value) || 0 }), min: "0", max: "100", step: "0.5", className: inputClass })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", role: "switch", "aria-checked": form.freeTrialEnabled, onClick: () => setForm({ ...form, freeTrialEnabled: !form.freeTrialEnabled }), className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.freeTrialEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}` }) }), _jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Free Trial" })] }), form.freeTrialEnabled && (_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Trial Duration (days)" }), _jsx("input", { type: "number", value: form.trialDurationDays, onChange: (e) => setForm({ ...form, trialDurationDays: parseInt(e.target.value) || 7 }), min: "1", className: inputClass })] })), _jsxs("div", { className: "flex gap-3 pt-1", children: [_jsx("button", { type: "submit", disabled: saving, className: "flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: saving ? 'Submitting…' : 'Submit Lead' }), _jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors", children: "Cancel" })] })] }));
}
