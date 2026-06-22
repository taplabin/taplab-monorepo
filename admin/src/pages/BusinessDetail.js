import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
function getDisplayStatus(b) {
    if (b.subscriptionStatus === 'active')
        return 'active';
    if (b.subscriptionStatus === 'cancelled')
        return 'cancelled';
    if (b.freeTrialEnabled && b.trialStartDate) {
        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
        if (Date.now() < trialEnd)
            return 'trial';
    }
    return 'inactive';
}
function RefreshLinkButton({ label, onFetch }) {
    const [link, setLink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const handleClick = async () => {
        setLoading(true);
        setError(null);
        setLink(null);
        try {
            setLink(await onFetch());
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCopy = () => {
        if (!link)
            return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (_jsxs("div", { children: [_jsx("button", { onClick: handleClick, disabled: loading, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors", children: loading ? 'Fetching...' : label }), error && _jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: error }), link && (_jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("input", { type: "text", value: link, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: handleCopy, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors", children: copied ? 'Copied!' : 'Copy' })] }))] }));
}
function ReferralBonusCard({ slug, brokerName }) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [paying, setPaying] = useState(false);
    const handlePay = async () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0)
            return;
        setPaying(true);
        try {
            const res = await adminFetch(`/api/admin/business/${slug}/pay-referral-bonus`, {
                method: 'POST',
                body: JSON.stringify({ amount: amt }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            toast('Referral bonus sent via RazorpayX');
        }
        catch (err) {
            toast(err.message || 'Failed to send bonus', 'error');
        }
        finally {
            setPaying(false);
        }
    };
    return (_jsxs("div", { className: "bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1", children: "Referral Bonus Pending" }), _jsxs("p", { className: "text-xs text-amber-700 dark:text-amber-400 mb-4", children: [brokerName, " was referred by another broker. Set the bonus amount and pay via RazorpayX."] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "Amount (\u20B9)", min: "500", className: "flex-1 px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" }), _jsx("button", { onClick: handlePay, disabled: paying || !amount || parseFloat(amount) <= 0, className: "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors", children: paying ? 'Paying…' : 'Pay Now' })] })] }));
}
export default function BusinessDetail() {
    const { slug } = useParams();
    const toast = useToast();
    const { data: business, error: businessError } = useSWR(slug ? `/api/admin/business/${slug}` : null, async (url) => {
        const res = await adminFetch(url);
        return (await res.json());
    });
    const { data: paymentsData } = useSWR(slug ? `/api/admin/business/${slug}/payments` : null, async (url) => {
        const res = await adminFetch(url);
        return (await res.json());
    });
    const [emailInput, setEmailInput] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [emailInviteLink, setEmailInviteLink] = useState(null);
    const [ownerEmailSet, setOwnerEmailSet] = useState(null);
    const [notes, setNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);
    useEffect(() => {
        if (business)
            setNotes(business.notes ?? '');
    }, [business]);
    const handleSetEmail = async (e) => {
        e.preventDefault();
        setEmailSaving(true);
        setEmailError(null);
        setEmailInviteLink(null);
        try {
            const res = await adminFetch(`/api/admin/business/${slug}/set-owner-email`, {
                method: 'POST',
                body: JSON.stringify({ ownerEmail: emailInput }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.detail || data.error || 'Failed to set email');
            setOwnerEmailSet(emailInput);
            setEmailInviteLink(data.inviteLink);
            toast('Owner email set — invite link ready');
        }
        catch (err) {
            setEmailError(err.message);
        }
        finally {
            setEmailSaving(false);
        }
    };
    const handleSaveNotes = async () => {
        setNotesSaving(true);
        try {
            const res = await adminFetch(`/api/admin/business/${slug}`, {
                method: 'PUT',
                body: JSON.stringify({ notes }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save notes');
            }
            toast('Notes saved');
        }
        catch (err) {
            toast(err.message, 'error');
        }
        finally {
            setNotesSaving(false);
        }
    };
    if (businessError) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "text-center py-12 text-red-600 dark:text-red-400", children: ["Error loading business: ", businessError.message] }) }));
    }
    if (!business) {
        return (_jsx(Layout, { children: _jsx("div", { className: "text-center py-12 text-gray-400 dark:text-gray-500 animate-pulse", children: "Loading..." }) }));
    }
    const resolvedOwnerEmail = ownerEmailSet ?? business.ownerEmail;
    const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6';
    const dtClass = 'text-sm font-medium text-gray-500 dark:text-gray-400';
    const ddClass = 'mt-1 text-sm text-gray-900 dark:text-gray-100';
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-5", children: [_jsx(Link, { to: "/businesses", className: "inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300", children: "\u2190 Back to businesses" }), _jsx("div", { className: cardClass, children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900 dark:text-white", children: business.businessName }), _jsxs("p", { className: "text-sm text-gray-400 dark:text-gray-500 mt-0.5 font-mono", children: ["/", business.businessSlug] })] }), _jsx(StatusBadge, { status: getDisplayStatus(business) })] }) }), _jsx("div", { className: cardClass, children: resolvedOwnerEmail ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-1", children: "Owner Invite Link" }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-4", children: [_jsx("span", { className: "font-medium text-gray-600 dark:text-gray-300", children: resolvedOwnerEmail }), ' ', "\u00B7 Get a fresh Firebase password-set link. Valid for 1 hour."] }), _jsx(RefreshLinkButton, { label: "Get Invite Link", onFetch: async () => {
                                    const res = await adminFetch(`/api/admin/business/${slug}/refresh-invite`, { method: 'POST' });
                                    const data = await res.json();
                                    if (!res.ok)
                                        throw new Error(data.detail || data.message || data.error || 'Failed');
                                    return data.inviteLink;
                                } }), emailInviteLink && (_jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("input", { type: "text", value: emailInviteLink, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => { navigator.clipboard.writeText(emailInviteLink); toast('Invite link copied'); }, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors", children: "Copy" })] }))] })) : (_jsxs(_Fragment, { children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-1", children: "Set Owner Email" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-4", children: "No owner email yet. Add one to create a portal account and generate an invite link." }), _jsxs("form", { onSubmit: handleSetEmail, className: "flex gap-2", children: [_jsx("input", { type: "email", value: emailInput, onChange: (e) => setEmailInput(e.target.value), placeholder: "owner@business.com", required: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" }), _jsx("button", { type: "submit", disabled: emailSaving, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors", children: emailSaving ? 'Setting…' : 'Set Email' })] }), emailError && _jsx("p", { className: "mt-2 text-sm text-red-600 dark:text-red-400", children: emailError }), emailInviteLink && (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-2", children: "Account created \u2014 share this invite link:" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: emailInviteLink, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => { navigator.clipboard.writeText(emailInviteLink); toast('Invite link copied'); }, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors", children: "Copy" })] })] }))] })) }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "Subscription Details" }), _jsxs("dl", { className: "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("dt", { className: dtClass, children: "Recurring Price" }), _jsxs("dd", { className: ddClass, children: ["\u20B9", business.pricingAmount.toLocaleString('en-IN'), "/", business.billingCycle === 'monthly' ? 'month' : 'year'] })] }), _jsxs("div", { children: [_jsx("dt", { className: dtClass, children: "Setup / Dev Fee" }), _jsx("dd", { className: ddClass, children: business.setupFee ? `₹${business.setupFee.toLocaleString('en-IN')} (one-time)` : '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: dtClass, children: "Free Trial" }), _jsx("dd", { className: ddClass, children: business.freeTrialEnabled ? `Enabled (${business.trialDurationDays} days)` : 'Disabled' })] }), business.razorpayPaymentLink && (_jsxs("div", { className: "sm:col-span-2", children: [_jsx("dt", { className: `${dtClass} mb-2`, children: "Payment Link" }), _jsxs("div", { className: "flex gap-2 mb-3", children: [_jsx("input", { type: "text", value: business.razorpayPaymentLink, readOnly: true, className: "flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300" }), _jsx("button", { onClick: () => { navigator.clipboard.writeText(business.razorpayPaymentLink); toast('Payment link copied'); }, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors", children: "Copy" })] }), _jsx(RefreshLinkButton, { label: "Refresh Payment Link", onFetch: async () => {
                                                const res = await adminFetch(`/api/admin/business/${slug}/refresh-payment-link`, { method: 'POST' });
                                                const data = await res.json();
                                                if (!res.ok)
                                                    throw new Error(data.detail || data.message || data.error || 'Failed');
                                                return data.paymentLink;
                                            } })] }))] })] }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "Page Deployment" }), _jsxs("dl", { className: "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("dt", { className: dtClass, children: "Status" }), _jsx("dd", { className: "mt-1 text-sm font-medium", children: business.pageStatus === 'deployed' ? (_jsx("span", { className: "text-green-600 dark:text-green-400", children: "Deployed" })) : (_jsx("span", { className: "text-yellow-600 dark:text-yellow-400", children: "Awaiting Deployment" })) })] }), business.pageVersion && (_jsxs("div", { children: [_jsx("dt", { className: dtClass, children: "Version" }), _jsx("dd", { className: `${ddClass} font-mono`, children: business.pageVersion })] })), business.componentTagName && (_jsxs("div", { className: "sm:col-span-2", children: [_jsx("dt", { className: dtClass, children: "Component Tag" }), _jsx("dd", { className: `${ddClass} font-mono`, children: business.componentTagName })] })), business.pageJsUrl && (_jsxs("div", { className: "sm:col-span-2", children: [_jsx("dt", { className: dtClass, children: "CDN URL" }), _jsx("dd", { className: `${ddClass} font-mono break-all`, children: business.pageJsUrl })] }))] })] }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-4", children: "Payment History" }), paymentsData?.payments && paymentsData.payments.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Date" }), _jsx("th", { className: "py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Amount" }), _jsx("th", { className: "py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide", children: "Status" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100 dark:divide-gray-800", children: paymentsData.payments.map((payment, idx) => (_jsxs("tr", { children: [_jsx("td", { className: "py-3 text-sm text-gray-900 dark:text-gray-200", children: new Date(payment.created_at * 1000).toLocaleDateString('en-IN') }), _jsxs("td", { className: "py-3 text-sm text-gray-900 dark:text-gray-200", children: ["\u20B9", (payment.amount / 100).toFixed(2)] }), _jsx("td", { className: "py-3 text-sm", children: _jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'paid'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`, children: payment.status }) })] }, idx))) })] }) })) : (_jsx("p", { className: "text-sm text-gray-400 dark:text-gray-500", children: paymentsData?.message || 'No payment history available' }))] }), _jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-1", children: "Internal Notes" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mb-4", children: "Visible only in the admin panel." }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 4, placeholder: "Add internal notes about this business...", className: "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" }), _jsx("button", { onClick: handleSaveNotes, disabled: notesSaving, className: "mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors", children: notesSaving ? 'Saving…' : 'Save Notes' })] }), business.referralBonusPending && !business.referralBonusSent && (_jsx(ReferralBonusCard, { slug: slug, brokerName: business.brokerName ?? 'Broker' })), business.referralBonusSent && business.referralBonusAmount && (_jsxs("div", { className: cardClass, children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-1", children: "Referral Bonus" }), _jsxs("p", { className: "text-sm text-green-600 dark:text-green-400", children: ["\u20B9", business.referralBonusAmount.toLocaleString('en-IN'), " paid to referring broker"] })] }))] }) }));
}
