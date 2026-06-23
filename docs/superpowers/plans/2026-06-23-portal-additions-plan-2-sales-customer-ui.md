# Portal Additions — Plan 2: Sales Portal + Customer Portal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual banner, broker profiles, team page, feedback wall to the sales portal — and a feedback tab to the customer portal.

**Architecture:** All new pages added to existing `sales/` and `portal/` Vite apps. No new apps. Profile photo upload uses `brokerFetch` with multipart form. Feedback wall fetches from `/api/broker/feedback`. Customer feedback posts to `/api/portal/feedback`. New nav items added to both Layout components.

**Prerequisites:** Plan 1 (Backend + Admin) must be deployed first. The PDF `TapLab-Broker-Sales-Manual.pdf` must be placed in `sales/public/` before building.

**Tech Stack:** React + Vite + Tailwind + SWR, existing `brokerFetch` in `sales/src/lib/api.ts`, existing `portalFetch` in `portal/src/lib/api.ts`.

**Read first:**
- `sales/src/components/Layout.tsx` — NAV array pattern to add new items
- `sales/src/App.tsx` — Routes to add new pages
- `portal/src/components/Layout.tsx` — NAV pattern for portal
- `portal/src/App.tsx` — Routes for portal

---

## File Map

**New files — sales portal:**
- `sales/src/pages/MyProfile.tsx` — own profile edit page (bio, city, photo upload)
- `sales/src/pages/BrokerProfile.tsx` — view another broker's profile (read-only)
- `sales/src/pages/Team.tsx` — team directory page
- `sales/src/pages/Feedback.tsx` — broker feedback wall with submit + vote

**New files — customer portal:**
- `portal/src/pages/Feedback.tsx` — customer feedback submission + own history

**Modified files — sales portal:**
- `sales/src/components/Layout.tsx` — add Team + Feedback nav items
- `sales/src/App.tsx` — add routes for all new pages
- `sales/src/pages/Dashboard.tsx` — add manual banner card + My Profile link
- `sales/src/pages/Leaderboard.tsx` — make broker names clickable to profile

**Modified files — customer portal:**
- `portal/src/components/Layout.tsx` — add Feedback nav item
- `portal/src/App.tsx` — add /feedback route

---

## Task 1: Place PDF + add manual banner to Dashboard

**Files:**
- Add file: `sales/public/TapLab-Broker-Sales-Manual.pdf`
- Modify: `sales/src/pages/Dashboard.tsx`

- [ ] **Place the PDF** — copy `TapLab-Broker-Sales-Manual.pdf` into `sales/public/`. Once deployed to Netlify, it will be accessible at `https://sales.taplab.in/TapLab-Broker-Sales-Manual.pdf`.

- [ ] **Add manual banner to `sales/src/pages/Dashboard.tsx`** — find the `return (` statement and add this banner card right after the opening `<Layout>` and before the `<div className="max-w-2xl space-y-5">`:

Actually, add it inside the `space-y-5` div, as the first item after the title block. Find this section:

```typescript
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your performance this month</p>
        </div>
```

And add the manual banner immediately after it:

```typescript
        {/* Sales Manual banner */}
        <a
          href="/TapLab-Broker-Sales-Manual.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Sales Manual</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Rules, scripts, and everything you need to close deals</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
```

- [ ] **Build sales:**
```bash
cd sales && npm run build
```
Expected: clean build, PDF visible in dist/

- [ ] **Commit:**
```bash
git add sales/public/TapLab-Broker-Sales-Manual.pdf sales/src/pages/Dashboard.tsx
git commit -m "feat: sales manual banner on dashboard + PDF in public folder"
```

---

## Task 2: My Profile page (own profile edit + photo upload)

**Files:**
- Create: `sales/src/pages/MyProfile.tsx`

- [ ] **Create `sales/src/pages/MyProfile.tsx`:**

```typescript
import { useState, useRef } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

export default function MyProfile() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ bio: string; city: string } | null>(null);

  const { data: profile, mutate } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<any>;
  }, {
    onSuccess: (data) => {
      if (!form) setForm({ bio: data.bio ?? '', city: data.city ?? '' });
    },
  });

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Profile updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'error'); return; }
    setUploading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const token = await getAuth().currentUser!.getIdToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/broker/profile/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Photo updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <Layout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Visible to other brokers on the team page and leaderboard</p>
        </div>

        {/* Photo */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
              {profile?.photoUrl ? (
                <img src={`${profile.photoUrl}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name ?? '…'}</p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>
        </div>

        {/* Bio + City */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
            <input
              type="text"
              value={form?.city ?? ''}
              onChange={(e) => setForm(f => f ? { ...f, city: e.target.value } : f)}
              placeholder="Mumbai"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bio <span className="text-gray-400 font-normal text-xs">({form?.bio?.length ?? 0}/300)</span>
            </label>
            <textarea
              value={form?.bio ?? ''}
              onChange={(e) => setForm(f => f ? { ...f, bio: e.target.value.slice(0, 300) } : f)}
              rows={3}
              placeholder="A short intro about yourself…"
              className={`${inputClass} resize-none`}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Read-only info */}
        {profile && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Account Info</p>
            <dl className="space-y-2">
              {[
                { label: 'Email', value: profile.email },
                { label: 'Phone', value: profile.phone },
                { label: 'Bank Status', value: profile.bankVerified ? 'Verified ✓' : 'Pending' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Build:**
```bash
cd sales && npm run build
```

- [ ] **Commit:**
```bash
git add sales/src/pages/MyProfile.tsx
git commit -m "feat: My Profile page with bio, city, photo upload"
```

---

## Task 3: Broker Profile page (read-only view)

**Files:**
- Create: `sales/src/pages/BrokerProfile.tsx`

This page is opened when clicking a name on the Leaderboard or a card on the Team page. Route: `/profile/:id`.

- [ ] **Create `sales/src/pages/BrokerProfile.tsx`:**

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function BrokerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useSWR(`/api/broker/profile/${id}`, async (url) => {
    const res = await brokerFetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<any>;
  });

  return (
    <Layout>
      <div className="max-w-lg space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : !data ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Broker not found.</p>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                  {data.photoUrl ? (
                    <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                      {data.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.name}</p>
                  {data.city && <p className="text-sm text-gray-400 dark:text-gray-500">{data.city}</p>}
                </div>
              </div>
              {data.bio && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Deals This Month', value: data.dealsThisMonth.toString() },
                { label: 'All Time Deals', value: data.dealsAllTime.toString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/BrokerProfile.tsx
git commit -m "feat: BrokerProfile read-only page"
```

---

## Task 4: Team page

**Files:**
- Create: `sales/src/pages/Team.tsx`

- [ ] **Create `sales/src/pages/Team.tsx`:**

```typescript
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

export default function Team() {
  const navigate = useNavigate();

  const { data } = useSWR('/api/broker/team', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).brokers as any[];
  });

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Everyone on the TapLab sales network</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!data ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : data.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">No team members yet.</p>
          ) : data.map((broker: any) => (
            <button
              key={broker.id}
              onClick={() => navigate(`/profile/${broker.id}`)}
              className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left w-full"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                {broker.photoUrl ? (
                  <img src={broker.photoUrl} alt={broker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                    {broker.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{broker.name}</p>
                {broker.city && <p className="text-xs text-gray-400 dark:text-gray-500">{broker.city}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {broker.dealsThisMonth} this month · {broker.dealsAllTime} all time
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/Team.tsx
git commit -m "feat: Team page with broker cards"
```

---

## Task 5: Broker Feedback wall page

**Files:**
- Create: `sales/src/pages/Feedback.tsx`

- [ ] **Create `sales/src/pages/Feedback.tsx`:**

```typescript
import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

const TAGS = ['Suggestion', 'Complaint', 'Question', 'Win'] as const;
type Tag = typeof TAGS[number];

const TAG_COLORS: Record<Tag, string> = {
  Suggestion: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  Complaint: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  Question: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  Win: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'text-gray-400 dark:text-gray-500',
  under_review: 'text-yellow-600 dark:text-yellow-400',
  implemented: 'text-green-600 dark:text-green-400',
  wont_fix: 'text-red-500 dark:text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', under_review: 'Under Review', implemented: 'Implemented', wont_fix: "Won't Fix",
};

export default function Feedback() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ content: '', tag: 'Suggestion' as Tag });
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1 | null>>({});

  const { data, mutate } = useSWR('/api/broker/feedback', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).feedback as any[];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await brokerFetch('/api/broker/feedback', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Feedback submitted');
      setShowForm(false);
      setForm({ content: '', tag: 'Suggestion' });
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string, vote: 1 | -1) => {
    setVotingId(id);
    const prev = myVotes[id] ?? null;
    // Optimistic update
    setMyVotes(v => ({ ...v, [id]: prev === vote ? null : vote }));
    try {
      const res = await brokerFetch(`/api/broker/feedback/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      mutate();
    } catch (err: any) {
      setMyVotes(v => ({ ...v, [id]: prev }));
      toast(err.message || 'Failed to vote', 'error');
    } finally {
      setVotingId(null);
    }
  };

  const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">One submission per week. Upvote what matters most.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Submit
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Feedback</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tag: t }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.tag === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-gray-400 font-normal text-xs">({form.content.length}/1000)</span>
              </label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value.slice(0, 1000) }))}
                rows={4}
                placeholder="Be specific and constructive. This goes to TapLab leadership."
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {!data ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : data.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No feedback yet. Be the first to submit.</p>
            </div>
          ) : data.map((item: any) => {
            const myVote = myVotes[item.id] ?? null;
            return (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start gap-3">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                    <button
                      onClick={() => handleVote(item.id, 1)}
                      disabled={votingId === item.id}
                      className={`p-1 rounded transition-colors ${myVote === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l8 8H4l8-8z" />
                      </svg>
                    </button>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.upvotes - item.downvotes}</span>
                    <button
                      onClick={() => handleVote(item.id, -1)}
                      disabled={votingId === item.id}
                      className={`p-1 rounded transition-colors ${myVote === -1 ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 20l-8-8h16l-8 8z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[item.tag as Tag] ?? ''}`}>{item.tag}</span>
                      <span className={`text-[10px] font-medium ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{item.brokerName}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{item.content}</p>
                    {item.adminReply && (
                      <div className="mt-3 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700">
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">TapLab</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{item.adminReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/Feedback.tsx
git commit -m "feat: broker feedback wall with upvotes, tags, admin reply display"
```

---

## Task 6: Wire all new pages into sales portal routing + nav

**Files:**
- Modify: `sales/src/App.tsx`
- Modify: `sales/src/components/Layout.tsx`
- Modify: `sales/src/pages/Leaderboard.tsx`

- [ ] **Update `sales/src/App.tsx`** — add imports and routes:

```typescript
import MyProfile from './pages/MyProfile';
import BrokerProfile from './pages/BrokerProfile';
import Team from './pages/Team';
import Feedback from './pages/Feedback';
// Inside <Routes>:
<Route path="/profile/me"   element={<MyProfile />} />
<Route path="/profile/:id"  element={<BrokerProfile />} />
<Route path="/team"         element={<Team />} />
<Route path="/feedback"     element={<Feedback />} />
```

**Important:** `/profile/me` must be listed BEFORE `/profile/:id` in the Routes so it isn't swallowed by the dynamic param route.

- [ ] **Add Team and Feedback to `sales/src/components/Layout.tsx`** — find the NAV array and add after the Earnings entry:

```typescript
  {
    to: '/team',
    label: 'Team',
    icon: (_active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/feedback',
    label: 'Feedback',
    icon: (_active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
```

Also add a "My Profile" link at the bottom of the sidebar (in the sign-out section), before the sign-out button:

```typescript
          <NavLink
            to="/profile/me"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? activeClass : inactiveClass}`
            }
          >
            {() => (
              <>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Profile</span>
              </>
            )}
          </NavLink>
```

- [ ] **Make broker names clickable in `sales/src/pages/Leaderboard.tsx`** — find the row rendering and wrap the name in a `useNavigate` call:

```typescript
// Add at top of component:
const navigate = useNavigate();

// Change the name span to a button:
<button
  onClick={() => navigate(`/profile/${row.brokerId}`)}
  className={`text-sm font-medium flex-1 text-left hover:underline ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}
>
  {row.name}{isMe ? ' (you)' : ''}
</button>
```

- [ ] **Build:**
```bash
cd sales && npm run build
```
Expected: clean build

- [ ] **Commit:**
```bash
git add sales/src/App.tsx sales/src/components/Layout.tsx sales/src/pages/Leaderboard.tsx
git commit -m "feat: wire Team, Feedback, Profile pages into sales portal nav and routing"
```

---

## Task 7: Customer portal Feedback page

**Files:**
- Create: `portal/src/pages/Feedback.tsx`
- Modify: `portal/src/App.tsx`
- Modify: `portal/src/components/Layout.tsx`

- [ ] **Create `portal/src/pages/Feedback.tsx`:**

```typescript
import { useState } from 'react';
import useSWR from 'swr';
import { portalFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

export default function Feedback() {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data, mutate } = useSWR('/api/portal/feedback', async (url) => {
    const res = await portalFetch(url);
    return (await res.json()).feedback as any[];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) { toast('Please write at least 10 characters', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await portalFetch('/api/portal/feedback', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Feedback sent — thank you!');
      setContent('');
      setSubmitted(true);
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  function formatDate(ts: { seconds: number } | null): string {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="max-w-lg space-y-6 px-1">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Share your thoughts directly with the TapLab team. All feedback is private.
          </p>
        </div>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value.slice(0, 2000)); setSubmitted(false); }}
            rows={5}
            placeholder="What's working well? What could be better? Any feature requests?"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{content.length}/2000</span>
            <button
              type="submit"
              disabled={submitting || content.trim().length < 10}
              className="px-5 py-2 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending…' : submitted ? 'Sent ✓' : 'Send Feedback'}
            </button>
          </div>
        </form>

        {/* Past submissions */}
        {data && data.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Your Previous Feedback</p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {data.map((item: any) => (
                <div key={item.id} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{item.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

Note: Uses `bg-[#2087e6]` (portal's brand blue) instead of indigo to match the portal's existing color scheme. Check `portal/src/components/Layout.tsx` to confirm the active color — it should be `bg-[#2087e6]`.

- [ ] **Add Feedback route to `portal/src/App.tsx`** — add import and route inside `PortalApp`:

```typescript
import Feedback from './pages/Feedback';
// Inside Routes in PortalApp:
<Route path="/feedback" element={selectedSlug ? <Feedback /> : goToPages} />
```

- [ ] **Add Feedback nav item to `portal/src/components/Layout.tsx`** — add after the Settings entry in the NAV array:

```typescript
  {
    to: '/feedback',
    label: 'Feedback',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
```

- [ ] **Build portal:**
```bash
cd portal && npm run build
```
Expected: clean build

- [ ] **Commit:**
```bash
git add portal/src/pages/Feedback.tsx portal/src/App.tsx portal/src/components/Layout.tsx
git commit -m "feat: customer portal Feedback tab with private submission + history"
```

---

## Self-Review

**Spec coverage:**
- ✅ Manual banner card on Dashboard linking to PDF — Task 1
- ✅ My Profile page (bio, city, photo upload to R2) — Task 2
- ✅ Read-only broker profile page — Task 3
- ✅ Team page with broker cards — Task 4
- ✅ Leaderboard names clickable to profile — Task 6
- ✅ My Profile accessible from sidebar — Task 6
- ✅ Feedback wall (submit, one-per-week enforced server-side, upvotes/downvotes, tags, admin reply display, status) — Task 5
- ✅ Customer portal Feedback tab (private, own history shown) — Task 7
- ✅ All new routes wired in App.tsx — Task 6 (sales) + Task 7 (portal)
- ✅ All new nav items added to Layout — Task 6 (sales) + Task 7 (portal)

**Type consistency:**
- `brokerFetch` used throughout sales portal (not `fetch` directly) — photo upload uses raw `fetch` with manual token because FormData can't go through `brokerFetch`'s JSON Content-Type header, which is correct
- `/api/broker/profile/:id` matches backend route `GET /profile/:id` registered in `brokerProfileRoute`
- `/api/broker/team` matches backend `GET /team`
- `/api/portal/feedback` matches backend portal route `POST /feedback` and `GET /feedback`

**Portal brand color:** Customer portal uses `bg-[#2087e6]` (blue) not indigo — confirmed in Layout.tsx line 59. Feedback page submit button matches this.
