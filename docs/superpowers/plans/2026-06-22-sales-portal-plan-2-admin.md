# Sales Portal — Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin panel with a Leads queue (client leads + broker referrals), updated broker creation form (bank details + referredBy), updated broker/business detail pages, and a streak config page.

**Architecture:** Follows all existing admin patterns — SWR for data fetching, `adminFetch` from `lib/api.ts`, Tailwind dark mode, `useToast` for notifications, `Layout` wrapper. No new dependencies.

**Prerequisites:** Plan 1 (Backend) must be deployed before this plan is implemented.

**Read first:** `admin/src/pages/Brokers.tsx`, `admin/src/pages/BrokerDetail.tsx`, `admin/src/pages/BusinessDetail.tsx` — this plan modifies all three and adds new pages that follow their patterns exactly.

---

## File Map

**Create:**
- `admin/src/pages/Leads.tsx`
- `admin/src/pages/LeadDetail.tsx`
- `admin/src/pages/StreakConfig.tsx`
- `admin/src/hooks/useLeadsCount.ts`

**Modify:**
- `admin/src/App.tsx` — add routes
- `admin/src/components/Layout.tsx` — add Leads nav item with badge
- `admin/src/pages/Brokers.tsx` — add bank details + referredBy to add form
- `admin/src/pages/BrokerDetail.tsx` — add bank details section + verification status
- `admin/src/pages/BusinessDetail.tsx` — add referral bonus pending section

---

## Task 1: useLeadsCount hook + nav item

**Files:**
- Create: `admin/src/hooks/useLeadsCount.ts`
- Modify: `admin/src/components/Layout.tsx`

- [ ] **Create `admin/src/hooks/useLeadsCount.ts`:**

```typescript
import useSWR from 'swr';
import { adminFetch } from '../lib/api';

export function useLeadsCount(): number {
  const { data } = useSWR('/api/admin/leads?status=pending', async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return (json.leads as any[])?.length ?? 0;
  }, { refreshInterval: 60000 });
  return data ?? 0;
}
```

- [ ] **In `admin/src/components/Layout.tsx`**, add the Leads nav item to the `NAV` array, between Alerts and Add Business:

```typescript
{
  to: '/leads',
  label: 'Leads',
  icon: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
},
```

- [ ] **Import and call `useLeadsCount`** in `Layout.tsx` (alongside the existing `useAlertCount` call):

```typescript
import { useLeadsCount } from '../hooks/useLeadsCount';
// ...inside Layout component:
const leadsCount = useLeadsCount();
```

- [ ] **Add the badge to the Leads nav link** in the `NavLink` render — find the existing badge for `/alerts` and add the same pattern for `/leads`:

```typescript
{item.to === '/leads' && leadsCount > 0 && (
  <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
    {leadsCount > 99 ? '99+' : leadsCount}
  </span>
)}
```

- [ ] **Commit:**
```bash
git add admin/src/hooks/useLeadsCount.ts admin/src/components/Layout.tsx
git commit -m "feat: Leads nav item with pending count badge"
```

---

## Task 2: Leads list page

**Files:**
- Create: `admin/src/pages/Leads.tsx`

- [ ] **Create `admin/src/pages/Leads.tsx`:**

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

type LeadStatus = 'pending' | 'approved' | 'rejected';

interface Lead {
  id: string;
  brokerId: string;
  brokerName: string;
  businessName: string;
  businessSlug: string;
  pricingAmount: number;
  billingCycle: string;
  setupFee: number;
  commissionPercent: number;
  status: LeadStatus;
  rejectionReason: string | null;
  createdAt: { seconds: number };
}

const TABS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

export default function Leads() {
  const [tab, setTab] = useState<LeadStatus>('pending');

  const { data, isLoading } = useSWR(`/api/admin/leads?status=${tab}`, async (url) => {
    const res = await adminFetch(url);
    const json = await res.json();
    return json.leads as Lead[];
  });

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Client leads and broker referrals submitted by your sales network</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value as LeadStatus)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!data || data.length === 0) && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No {tab} leads.</p>
            </div>
          )}

          {!isLoading && data && data.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.businessName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      by {lead.brokerName} · ₹{lead.pricingAmount.toLocaleString('en-IN')}/{lead.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      {lead.setupFee > 0 ? ` + ₹${lead.setupFee.toLocaleString('en-IN')} setup` : ''}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add admin/src/pages/Leads.tsx
git commit -m "feat: Leads list page with status tabs"
```

---

## Task 3: Lead detail page (review, edit, approve, reject)

**Files:**
- Create: `admin/src/pages/LeadDetail.tsx`

- [ ] **Create `admin/src/pages/LeadDetail.tsx`:**

```typescript
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface Lead {
  id: string;
  brokerName: string;
  brokerId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  businessName: string;
  businessSlug: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string | null;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  setupFee: number;
  commissionPercent: number;
  freeTrialEnabled: boolean;
  trialDurationDays: number;
}

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: lead, isLoading, mutate } = useSWR(
    id ? `/api/admin/leads/${id}` : null,
    async (url) => {
      const res = await adminFetch(url);
      if (!res.ok) throw new Error('Lead not found');
      return (await res.json()) as Lead;
    }
  );

  const [form, setForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [result, setResult] = useState<{ paymentLink: string; inviteLink: string | null } | null>(null);

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Changes saved');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await adminFetch(`/api/admin/leads/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ paymentLink: data.paymentLink, inviteLink: data.inviteLink ?? null });
      toast('Business created successfully');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to approve', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await adminFetch(`/api/admin/leads/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Lead rejected');
      mutate();
      setShowRejectForm(false);
    } catch (err: any) {
      toast(err.message || 'Failed to reject', 'error');
    } finally {
      setRejecting(false);
    }
  };

  if (isLoading || !lead) {
    return <Layout><div className="max-w-2xl animate-pulse space-y-4"><div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-48" /><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" /></div></Layout>;
  }

  const isPending = lead.status === 'pending';
  const cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5';

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/leads" className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{lead.businessName}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Submitted by {lead.brokerName}</p>
          </div>
        </div>

        {/* Status */}
        {lead.status === 'rejected' && lead.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Rejected</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{lead.rejectionReason}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Business created</p>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Link</p>
              <div className="flex gap-2">
                <input readOnly value={result.paymentLink} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
                <button onClick={() => { navigator.clipboard.writeText(result.paymentLink); toast('Copied'); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">Copy</button>
              </div>
            </div>
            {result.inviteLink && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portal Invite Link</p>
                <div className="flex gap-2">
                  <input readOnly value={result.inviteLink} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
                  <button onClick={() => { navigator.clipboard.writeText(result.inviteLink!); toast('Copied'); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">Copy</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lead fields — editable if pending */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Business Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Business Name', key: 'businessName', type: 'text' },
              { label: 'Slug', key: 'businessSlug', type: 'text' },
              { label: 'Owner Name', key: 'ownerName', type: 'text' },
              { label: 'Owner Phone', key: 'ownerPhone', type: 'tel' },
              { label: 'Owner Email', key: 'ownerEmail', type: 'email' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  type={type}
                  value={(form as any)[key] ?? ''}
                  onChange={(e) => isPending && setForm({ ...form, [key]: e.target.value })}
                  readOnly={!isPending}
                  className={`${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Pricing & Commission</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Pricing Amount (₹)', key: 'pricingAmount', type: 'number' },
              { label: 'Setup Fee (₹)', key: 'setupFee', type: 'number' },
              { label: 'Commission %', key: 'commissionPercent', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  type={type}
                  value={(form as any)[key] ?? ''}
                  onChange={(e) => isPending && setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
                  readOnly={!isPending}
                  className={`${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}`}
                />
              </div>
            ))}
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <select
                value={form.billingCycle ?? 'monthly'}
                onChange={(e) => isPending && setForm({ ...form, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                disabled={!isPending}
                className={`${inputClass} ${!isPending ? 'opacity-60 cursor-default' : ''}`}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className={cardClass}>
            {isPending && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mb-3 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {approving ? 'Creating…' : 'Approve & Create Business'}
              </button>
              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
              >
                Reject
              </button>
            </div>
            {showRejectForm && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <button
                  onClick={handleReject}
                  disabled={rejecting || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {rejecting ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add admin/src/pages/LeadDetail.tsx
git commit -m "feat: LeadDetail page with inline edit, approve, reject"
```

---

## Task 4: Update broker creation form

**Files:**
- Modify: `admin/src/pages/Brokers.tsx`

Add bank account number, IFSC, UPI ID, and `referredBy` fields to the existing "Add Broker" form. Email is now required.

- [ ] **In `Brokers.tsx`, update the form state** — replace the existing `form` state with:

```typescript
const [form, setForm] = useState({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' });
```

- [ ] **Import `BrokerCombobox`** at the top of `Brokers.tsx`:

```typescript
import BrokerCombobox from '../components/BrokerCombobox';
```

- [ ] **In the Add Broker form JSX**, add these fields after the existing email field:

```typescript
<div>
  <label className={labelClass}>Bank Account Number</label>
  <input
    type="text"
    value={form.bankAccountNumber}
    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
    placeholder="123456789012"
    className={inputClass}
  />
</div>
<div>
  <label className={labelClass}>IFSC Code</label>
  <input
    type="text"
    value={form.bankIfsc}
    onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
    placeholder="HDFC0000001"
    className={inputClass}
  />
</div>
<div>
  <label className={labelClass}>UPI ID <span className="font-normal normal-case text-gray-400 dark:text-gray-500">(optional)</span></label>
  <input
    type="text"
    value={form.upiId}
    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
    placeholder="broker@upi"
    className={inputClass}
  />
</div>
<div>
  <label className={labelClass}>Referred By <span className="font-normal normal-case text-gray-400 dark:text-gray-500">(optional)</span></label>
  <BrokerCombobox
    brokers={brokers ?? []}
    value={form.referredBy}
    onChange={(id) => setForm({ ...form, referredBy: id })}
  />
</div>
```

- [ ] **Update the reset in `handleAdd`** after success:

```typescript
setForm({ name: '', phone: '', email: '', bankAccountNumber: '', bankIfsc: '', upiId: '', referredBy: '' });
```

- [ ] **Show the invite link after creating a broker** — update the `handleAdd` success block:

```typescript
const data = await res.json();
toast(`Broker added — invite link: ${data.inviteLink}`);
```

Or store and display it inline (simpler for now is the toast approach).

- [ ] **Commit:**
```bash
git add admin/src/pages/Brokers.tsx
git commit -m "feat: broker creation form adds bank details + referredBy"
```

---

## Task 5: Update BrokerDetail page

**Files:**
- Modify: `admin/src/pages/BrokerDetail.tsx`

Add a bank details section showing verification status, masked account number, IFSC, and UPI ID.

- [ ] **Update the `BrokerWithDeals` interface** in `BrokerDetail.tsx` to include bank fields:

```typescript
interface BrokerWithDeals {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  bankVerified: boolean;
  razorpayFundAccountId: string | null;
  deals: Deal[];
}
```

- [ ] **Add a bank details card** in the JSX between the stats grid and the deal stack:

```typescript
{/* Bank Details */}
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bank Details</h2>
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      broker.bankVerified
        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
    }`}>
      {broker.bankVerified ? 'Verified' : 'Awaiting verification'}
    </span>
  </div>
  <dl className="space-y-2">
    {[
      { label: 'Account', value: broker.bankAccountNumber ?? '—' },
      { label: 'IFSC', value: broker.bankIfsc ?? '—' },
      { label: 'UPI', value: broker.upiId ?? '—' },
      { label: 'RazorpayX Fund Account', value: broker.razorpayFundAccountId ?? 'Not created yet' },
    ].map(({ label, value }) => (
      <div key={label} className="flex justify-between">
        <dt className="text-xs text-gray-400 dark:text-gray-500">{label}</dt>
        <dd className="text-xs font-medium text-gray-900 dark:text-white font-mono">{value}</dd>
      </div>
    ))}
  </dl>
</div>
```

- [ ] **Commit:**
```bash
git add admin/src/pages/BrokerDetail.tsx
git commit -m "feat: BrokerDetail shows bank details + verification status"
```

---

## Task 6: Update BusinessDetail — referral bonus section

**Files:**
- Modify: `admin/src/pages/BusinessDetail.tsx`

- [ ] **Update the `Business` interface** to include referral bonus fields:

```typescript
interface Business {
  // ...existing fields...
  brokerId: string | null;
  brokerName: string | null;
  referralBonusPending: boolean;
  referralBonusSent: boolean;
  referralBonusAmount: number | null;
}
```

- [ ] **Add a referral bonus card** at the bottom of the page JSX (before the closing `</div>`), after the Internal Notes card:

```typescript
{business.referralBonusPending && !business.referralBonusSent && (
  <ReferralBonusCard slug={slug!} brokerName={business.brokerName ?? 'Broker'} />
)}
{business.referralBonusSent && business.referralBonusAmount && (
  <div className={cardClass}>
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Referral Bonus</h2>
    <p className="text-sm text-green-600 dark:text-green-400">
      ₹{business.referralBonusAmount.toLocaleString('en-IN')} paid to referring broker
    </p>
  </div>
)}
```

- [ ] **Add the `ReferralBonusCard` component** at the top of `BusinessDetail.tsx` (before `BusinessDetail` function):

```typescript
function ReferralBonusCard({ slug, brokerName }: { slug: string; brokerName: string }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setPaying(true);
    try {
      const res = await adminFetch(`/api/admin/business/${slug}/pay-referral-bonus`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Referral bonus sent via RazorpayX');
    } catch (err: any) {
      toast(err.message || 'Failed to send bonus', 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">Referral Bonus Pending</h2>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">
        {brokerName} was referred by another broker. Set the bonus amount and pay via RazorpayX.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (₹)"
          min="500"
          className="flex-1 px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handlePay}
          disabled={paying || !amount || parseFloat(amount) <= 0}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {paying ? 'Paying…' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add admin/src/pages/BusinessDetail.tsx
git commit -m "feat: BusinessDetail shows referral bonus pending card"
```

---

## Task 7: Streak config page + routes

**Files:**
- Create: `admin/src/pages/StreakConfig.tsx`
- Modify: `admin/src/App.tsx`

- [ ] **Create `admin/src/pages/StreakConfig.tsx`:**

```typescript
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

interface Tier {
  fromDeal: number;
  bonusAmount: number;
}

export default function StreakConfig() {
  const toast = useToast();
  const { data, mutate } = useSWR('/api/admin/config', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()) as { tiers: Tier[] };
  });

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setTiers(data.tiers);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ tiers }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Streak config saved');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full';

  return (
    <Layout>
      <div className="max-w-lg space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Streak Config</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Configure bonus amounts for broker deal streaks</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
            <span>From deal #</span>
            <span>Bonus amount (₹)</span>
          </div>
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={tier.fromDeal}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...next[i], fromDeal: parseInt(e.target.value) || 0 };
                  setTiers(next);
                }}
                className={inputClass}
                min="1"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={tier.bonusAmount}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...next[i], bonusAmount: parseInt(e.target.value) || 0 };
                    setTiers(next);
                  }}
                  className={inputClass}
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTiers([...tiers, { fromDeal: 0, bonusAmount: 0 }])}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add tier
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Config'}
        </button>
      </div>
    </Layout>
  );
}
```

- [ ] **Update `admin/src/App.tsx`** — add imports and routes:

```typescript
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import StreakConfig from './pages/StreakConfig';
```

Add inside `<Routes>`:
```typescript
<Route path="/leads"           element={<Leads />} />
<Route path="/leads/:id"       element={<LeadDetail />} />
<Route path="/streak-config"   element={<StreakConfig />} />
```

- [ ] **Build and verify:**
```bash
cd admin && npm run build
```
Expected: no TypeScript or build errors

- [ ] **Commit:**
```bash
git add admin/src/pages/StreakConfig.tsx admin/src/App.tsx
git commit -m "feat: StreakConfig page + wire all new admin routes"
```
