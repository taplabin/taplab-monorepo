import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';
export default function LeadDetail() {
    const { id } = useParams();
    const toast = useToast();
    const navigate = useNavigate();
    const { data: lead, isLoading, mutate } = useSWR(id ? `/api/admin/leads/${id}` : null, async (url) => {
        const res = await adminFetch(url);
        if (!res.ok)
            throw new Error('Lead not found');
        return (await res.json());
    });
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [result, setResult] = useState(null);
    useEffect(() => {
        if (lead)
            setForm(lead);
    }, [lead]);
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await adminFetch(`/api/admin/leads/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(form),
            });
            if (!res.ok)
                throw new Error((await res.json()).error);
            toast('Changes saved');
            mutate();
        }
        catch (err) {
            toast(err.message || 'Failed to save', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    const handleApprove = async () => {
        setApproving(true);
        try {
            const res = await adminFetch(`/api/admin/leads/${id}/approve`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            setResult({ paymentLink: data.paymentLink, inviteLink: data.inviteLink ?? null });
            toast('Business created successfully');
            mutate();
        }
        catch (err) {
            toast(err.message || 'Failed to approve', 'error');
        }
        finally {
            setApproving(false);
        }
    };
    const handleReject = async () => {
        if (!rejectReason.trim())
            return;
        setRejecting(true);
        try {
            const res = await adminFetch(`/api/admin/leads/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: rejectReason }),
            });
            if (!res.ok)
                throw new Error((await res.json()).error);
            toast('Lead rejected');
            mutate();
            setShowRejectForm(false);
        }
        catch (err) {
            toast(err.message || 'Failed to reject', 'error');
        }
        finally {
            setRejecting(false);
        }
    };
    if (isLoading || !lead) {
        return _jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl animate-pulse space-y-4", children: [_jsx("div", { className: "h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" }), _jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" })] }) });
    }
    const isPending = lead.status === 'pending';
    const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5';
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl space-y-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Link, { to: "/leads", className: "p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 19l-7-7 7-7" }) }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: lead.businessName }), _jsxs("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5", children: ["Submitted by ", lead.brokerName] })] })] }), lead.status === 'rejected' && lead.rejectionReason && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4", children: [_jsx("p", { className: "text-sm font-medium text-red-800 dark:text-red-300", children: "Rejected" }), _jsx("p", { className: "text-sm text-red-700 dark:text-red-400 mt-1", children: lead.rejectionReason })] })), result && (_jsxs("div", { className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-3", children: [_jsx("p", { className: "text-sm font-semibold text-green-800 dark:text-green-300", children: "Business created" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Payment Link" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { readOnly: true, value: result.paymentLink, className: "flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => { navigator.clipboard.writeText(result.paymentLink); toast('Copied'); }, className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg", children: "Copy" })] })] }), result.inviteLink && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Portal Invite Link" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { readOnly: true, value: result.inviteLink, className: "flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => { navigator.clipboard.writeText(result.inviteLink); toast('Copied'); }, className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg", children: "Copy" })] })] }))] })), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "Business Details" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
                                { label: 'Business Name', key: 'businessName', type: 'text' },
                                { label: 'Slug', key: 'businessSlug', type: 'text' },
                                { label: 'Owner Name', key: 'ownerName', type: 'text' },
                                { label: 'Owner Phone', key: 'ownerPhone', type: 'tel' },
                                { label: 'Owner Email', key: 'ownerEmail', type: 'email' },
                            ].map(({ label, key, type }) => (_jsxs("div", { children: [_jsx("label", { className: labelClass, children: label }), _jsx("input", { type: type, value: form[key] ?? '', onChange: (e) => isPending && setForm({ ...form, [key]: e.target.value }), readOnly: !isPending, className: `${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}` })] }, key))) })] }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "Pricing & Commission" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [[
                                    { label: 'Pricing Amount (₹)', key: 'pricingAmount', type: 'number' },
                                    { label: 'Setup Fee (₹)', key: 'setupFee', type: 'number' },
                                    { label: 'Commission %', key: 'commissionPercent', type: 'number' },
                                ].map(({ label, key, type }) => (_jsxs("div", { children: [_jsx("label", { className: labelClass, children: label }), _jsx("input", { type: type, value: form[key] ?? '', onChange: (e) => isPending && setForm({ ...form, [key]: parseFloat(e.target.value) || 0 }), readOnly: !isPending, className: `${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}` })] }, key))), _jsxs("div", { children: [_jsx("label", { className: labelClass, children: "Billing Cycle" }), _jsxs("select", { value: form.billingCycle ?? 'monthly', onChange: (e) => isPending && setForm({ ...form, billingCycle: e.target.value }), disabled: !isPending, className: `${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}`, children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] })] })] }), isPending && (_jsxs("div", { className: cardClass, children: [isPending && (_jsx("button", { onClick: handleSave, disabled: saving, className: "w-full mb-3 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors", children: saving ? 'Saving…' : 'Save Changes' })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: handleApprove, disabled: approving, className: "flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: approving ? 'Creating…' : 'Approve & Create Business' }), _jsx("button", { onClick: () => setShowRejectForm(!showRejectForm), className: "px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors", children: "Reject" })] }), showRejectForm && (_jsxs("div", { className: "mt-4 space-y-3", children: [_jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Reason for rejection\u2026", rows: 3, className: "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" }), _jsx("button", { onClick: handleReject, disabled: rejecting || !rejectReason.trim(), className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: rejecting ? 'Rejecting…' : 'Confirm Rejection' })] }))] }))] }) }));
}
