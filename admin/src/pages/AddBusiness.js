import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import BrokerCombobox from '../components/BrokerCombobox';
const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
export default function AddBusiness() {
    const navigate = useNavigate();
    const { data: brokers } = useSWR('/api/admin/brokers', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.brokers;
    });
    const [formData, setFormData] = useState({
        businessName: '',
        businessSlug: '',
        ownerEmail: '',
        pricingAmount: 999,
        billingCycle: 'monthly',
        setupFee: 0,
        brokerId: '',
        commissionPercent: 10,
        freeTrialEnabled: false,
        trialDurationDays: 7,
        firstBillingDate: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const handleSlugInput = (val) => {
        const formatted = val
            .toLowerCase()
            .replace(/[\s\-]/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        setFormData({ ...formData, businessSlug: formatted });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { ...formData };
            if (formData.firstBillingDate) {
                payload.startAt = Math.floor(new Date(formData.firstBillingDate).getTime() / 1000);
            }
            delete payload.firstBillingDate;
            if (!payload.brokerId) {
                delete payload.brokerId;
                delete payload.commissionPercent;
            }
            const res = await adminFetch('/api/admin/business', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create business');
            }
            const data = await res.json();
            setResult({ paymentLink: data.paymentLink, inviteLink: data.inviteLink ?? null, setupFee: formData.setupFee });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    if (result) {
        return (_jsx(Layout, { children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 space-y-5", children: [_jsx("h2", { className: "text-xl font-semibold text-green-900 dark:text-green-300", children: "Business Created" }), result.setupFee > 0 && (_jsxs("p", { className: "text-sm text-green-800 dark:text-green-400", children: ["First payment includes \u20B9", result.setupFee.toLocaleString('en-IN'), " setup fee."] })), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Payment Link" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: result.paymentLink, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => navigator.clipboard.writeText(result.paymentLink), className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors", children: "Copy" })] })] }), result.inviteLink && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Portal Invite Link" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-2", children: "Share this with the owner \u2014 they click it to set their password and log in." }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: result.inviteLink, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => navigator.clipboard.writeText(result.inviteLink), className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors", children: "Copy" })] })] })), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { onClick: () => navigate('/businesses'), className: "px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors", children: "View All Businesses" }), _jsx("button", { onClick: () => {
                                        setResult(null);
                                        setFormData({
                                            businessName: '',
                                            businessSlug: '',
                                            ownerEmail: '',
                                            pricingAmount: 999,
                                            billingCycle: 'monthly',
                                            setupFee: 0,
                                            brokerId: '',
                                            commissionPercent: 10,
                                            freeTrialEnabled: false,
                                            trialDurationDays: 7,
                                            firstBillingDate: '',
                                        });
                                    }, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors", children: "Add Another" })] })] }) }) }));
    }
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl mx-auto space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Add New Business" }), _jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: "Create a new TapLab subscriber" })] }), _jsx("div", { className: "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Business Name" }), _jsx("input", { type: "text", value: formData.businessName, onChange: (e) => setFormData({ ...formData, businessName: e.target.value }), className: inputClass, required: true, placeholder: "Pizza Palace" })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Slug ", _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(lowercase, underscores only)" })] }), _jsx("input", { type: "text", value: formData.businessSlug, onChange: (e) => handleSlugInput(e.target.value), className: inputClass, required: true, pattern: "^[a-z0-9_]+$", placeholder: "pizza_palace" }), _jsxs("p", { className: "mt-1 text-xs text-gray-400 dark:text-gray-500", children: ["Used in the page URL: taplab.in/", _jsx("strong", { children: formData.businessSlug || 'slug' })] })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Owner Email ", _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(optional)" })] }), _jsx("input", { type: "email", value: formData.ownerEmail, onChange: (e) => setFormData({ ...formData, ownerEmail: e.target.value }), className: inputClass, placeholder: "owner@business.com" }), _jsx("p", { className: "mt-1 text-xs text-gray-400 dark:text-gray-500", children: "If provided, creates a portal account and generates an invite link." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Pricing Amount (\u20B9)" }), _jsx("input", { type: "number", value: formData.pricingAmount, onChange: (e) => setFormData({ ...formData, pricingAmount: parseInt(e.target.value) }), className: inputClass, required: true, min: "1" })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Billing Cycle" }), _jsxs("select", { value: formData.billingCycle, onChange: (e) => setFormData({ ...formData, billingCycle: e.target.value }), className: inputClass, children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Setup / Development Fee (\u20B9)", ' ', _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(optional \u2014 one-time, charged with first payment)" })] }), _jsx("input", { type: "number", value: formData.setupFee, onChange: (e) => setFormData({ ...formData, setupFee: parseInt(e.target.value) || 0 }), className: inputClass, min: "0", placeholder: "0" }), formData.setupFee > 0 && (_jsxs("p", { className: "mt-1 text-xs text-gray-400 dark:text-gray-500", children: ["First payment: \u20B9", (formData.setupFee + formData.pricingAmount).toLocaleString('en-IN'), " (\u20B9", formData.setupFee.toLocaleString('en-IN'), " setup + \u20B9", formData.pricingAmount.toLocaleString('en-IN'), " subscription). Subsequent payments: \u20B9", formData.pricingAmount.toLocaleString('en-IN'), "."] }))] }), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Broker", ' ', _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(optional)" })] }), _jsx(BrokerCombobox, { brokers: brokers ?? [], value: formData.brokerId, onChange: (id) => setFormData({ ...formData, brokerId: id }) })] }), formData.brokerId && (_jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["Commission %", ' ', _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(applied on setup fee)" })] }), _jsx("input", { type: "number", value: formData.commissionPercent, onChange: (e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 }), className: inputClass, min: "0", max: "100", step: "0.5" }), formData.setupFee > 0 && formData.commissionPercent > 0 && (_jsxs("p", { className: "mt-1 text-xs text-gray-400 dark:text-gray-500", children: ["Broker commission: \u20B9", Math.round(formData.commissionPercent / 100 * formData.setupFee).toLocaleString('en-IN'), " on \u20B9", formData.setupFee.toLocaleString('en-IN'), " setup fee"] })), formData.setupFee === 0 && (_jsx("p", { className: "mt-1 text-xs text-yellow-600 dark:text-yellow-400", children: "No setup fee set \u2014 commission will be \u20B90" }))] })), _jsxs("div", { children: [_jsxs("label", { className: labelClass, children: ["First billing date", ' ', _jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-normal", children: "(optional \u2014 defaults to today)" })] }), _jsx("input", { type: "date", value: formData.firstBillingDate, min: new Date().toISOString().split('T')[0], onChange: (e) => setFormData({ ...formData, firstBillingDate: e.target.value }), className: inputClass })] }), _jsxs("div", { className: "flex items-center gap-3 py-1", children: [_jsx("button", { type: "button", role: "switch", "aria-checked": formData.freeTrialEnabled, onClick: () => setFormData({ ...formData, freeTrialEnabled: !formData.freeTrialEnabled }), className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.freeTrialEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}` }) }), _jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300 font-medium", children: "Enable Free Trial" })] }), formData.freeTrialEnabled && (_jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Trial Duration (days)" }), _jsx("input", { type: "number", value: formData.trialDurationDays, onChange: (e) => setFormData({ ...formData, trialDurationDays: parseInt(e.target.value) }), className: inputClass, min: "1" })] })), error && (_jsx("div", { className: "text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3", children: error })), _jsxs("div", { className: "flex gap-3 pt-1", children: [_jsx("button", { type: "submit", disabled: loading, className: "flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: loading ? 'Creating...' : 'Create Business' }), _jsx("button", { type: "button", onClick: () => navigate('/businesses'), className: "px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", children: "Cancel" })] })] }) })] }) }));
}
