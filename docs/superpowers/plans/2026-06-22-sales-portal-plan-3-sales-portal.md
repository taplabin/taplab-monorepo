# Sales Portal — sales.taplab.in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `sales/` Vite app — a broker-facing portal at `sales.taplab.in` with dashboard, lead submission, broker referrals, leaderboard, and earnings.

**Architecture:** New `sales/` directory in the monorepo. Same Firebase project as `portal/` and `admin/`. Brokers authenticate with Firebase Auth (`broker: true` custom claim). API calls go to `/api/broker/*` routes via a Netlify proxy. Reuses the portal's Tailwind + dark mode + Layout patterns but built fresh (not a copy).

**Prerequisites:** Plan 1 (Backend) must be deployed. Plan 2 (Admin) recommended to be complete so broker accounts can be created for testing.

**Read first:** `portal/src/App.tsx`, `portal/src/lib/firebase.ts`, `portal/src/lib/api.ts`, `portal/src/components/Layout.tsx` — this plan follows their patterns exactly.

---

## File Map

All files are new under `sales/`.

```
sales/
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  index.html
  netlify.toml
  src/
    main.tsx
    App.tsx
    lib/
      firebase.ts
      api.ts
    context/
      ThemeContext.tsx
    components/
      Toast.tsx
      Layout.tsx
      Skeleton.tsx
    pages/
      Login.tsx
      BankVerification.tsx
      Dashboard.tsx
      Submissions.tsx
      SubmitLead.tsx
      SubmitReferral.tsx
      Leaderboard.tsx
      Earnings.tsx
```

---

## Task 1: Scaffold the sales/ app

- [ ] **Create `sales/package.json`** — copy from `portal/package.json` and change the name:

```json
{
  "name": "taplab-sales",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.7.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-firebase-hooks": "^5.1.1",
    "react-router-dom": "^6.21.0",
    "swr": "^2.2.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

- [ ] **Run `npm install` in `sales/`:**
```bash
cd sales && npm install
```

- [ ] **Copy config files** from `portal/` — these are identical:
```bash
cp portal/postcss.config.js sales/postcss.config.js
cp portal/tsconfig.json sales/tsconfig.json
```

- [ ] **Create `sales/tailwind.config.js`:**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'slide-in': { from: { transform: 'translateY(100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: { 'slide-in': 'slide-in 0.2s ease-out' },
    },
  },
  plugins: [],
};
```

- [ ] **Create `sales/vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Create `sales/index.html`:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/taplab.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TapLab Sales</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Create `sales/netlify.toml`:**

```toml
[[redirects]]
  from = "/api/*"
  to = "https://api.taplab.in/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Create `sales/src/main.tsx`:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Create `sales/src/index.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Verify the app compiles:**
```bash
cd sales && npm run build
```
Expected: build succeeds (will have warnings about missing pages — that's fine at this stage)

- [ ] **Commit:**
```bash
git add sales/
git commit -m "feat: scaffold sales/ Vite app"
```

---

## Task 2: Firebase, API client, ThemeContext, Toast

**Files:**
- Create: `sales/src/lib/firebase.ts`
- Create: `sales/src/lib/api.ts`
- Create: `sales/src/context/ThemeContext.tsx`
- Create: `sales/src/components/Toast.tsx`
- Create: `sales/src/components/Skeleton.tsx`

- [ ] **Create `sales/src/lib/firebase.ts`** — copy from `portal/src/lib/firebase.ts` exactly (same Firebase project, same config):

```bash
cp portal/src/lib/firebase.ts sales/src/lib/firebase.ts
```

- [ ] **Create `sales/src/lib/api.ts`:**

```typescript
import { getAuth } from 'firebase/auth';

const API_BASE = '/api';

export async function brokerFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}
```

- [ ] **Create `sales/src/context/ThemeContext.tsx`** — copy from `portal/src/context/ThemeContext.tsx` exactly:

```bash
cp portal/src/context/ThemeContext.tsx sales/src/context/ThemeContext.tsx
```

- [ ] **Create `sales/src/components/Toast.tsx`** — copy from `portal/src/components/Toast.tsx` exactly:

```bash
cp portal/src/components/Toast.tsx sales/src/components/Toast.tsx
```

- [ ] **Create `sales/src/components/Skeleton.tsx`:**

```typescript
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}
```

- [ ] **Commit:**
```bash
git add sales/src/
git commit -m "feat: Firebase, API client, ThemeContext, Toast for sales portal"
```

---

## Task 3: Layout component

**Files:**
- Create: `sales/src/components/Layout.tsx`

Four nav items: Dashboard, Submissions, Leaderboard, Earnings.

- [ ] **Create `sales/src/components/Layout.tsx`:**

```typescript
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    to: '/submissions',
    label: 'Submissions',
    icon: (active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/leaderboard',
    label: 'Leaderboard',
    icon: (active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/earnings',
    label: 'Earnings',
    icon: (active: boolean) => (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const activeClass = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  function SidebarContent() {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="px-5 pt-3.5 pb-5 border-b border-gray-100 dark:border-gray-800">
          <img src={theme === 'dark' ? '/taplabdark.png' : '/taplab.png'} alt="TapLab" className="h-10 w-auto" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sales Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? activeClass : inactiveClass}`
              }
            >
              {({ isActive }) => <>{item.icon(isActive)}<span>{item.label}</span></>}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button onClick={toggleTheme} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${inactiveClass}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              {theme === 'light'
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              }
            </svg>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button onClick={() => signOut(auth)} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${inactiveClass}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src={theme === 'dark' ? '/taplabdark.png' : '/taplab.png'} alt="TapLab" className="h-8 w-auto" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white dark:bg-gray-900 h-full shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 pt-14 md:pt-0 min-w-0">
        <main className="px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/components/Layout.tsx
git commit -m "feat: sales portal Layout with sidebar + mobile drawer"
```

---

## Task 4: Login page + App.tsx routing

**Files:**
- Create: `sales/src/pages/Login.tsx`
- Create: `sales/src/App.tsx`

- [ ] **Create `sales/src/pages/Login.tsx`** — copy `portal/src/pages/Login.tsx` exactly (same Firebase auth, same UI):

```bash
cp portal/src/pages/Login.tsx sales/src/pages/Login.tsx
```

Then update the title text inside it from "Customer Portal" to "Sales Portal" (one string change).

- [ ] **Create `sales/src/App.tsx`:**

```typescript
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import BankVerification from './pages/BankVerification';
import Dashboard from './pages/Dashboard';
import Submissions from './pages/Submissions';
import Leaderboard from './pages/Leaderboard';
import Earnings from './pages/Earnings';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isBroker, setIsBroker] = useState<boolean | null>(null);
  const [bankVerified, setBankVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsBroker(null); setBankVerified(null); return; }
    user.getIdTokenResult().then(async (result) => {
      if (!result.claims.broker) {
        setIsBroker(false);
        signOut(auth);
        return;
      }
      setIsBroker(true);
      // Check bank verification status
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/broker/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setBankVerified(data.bankVerified ?? false);
      } catch {
        setBankVerified(false);
      }
    });
  }, [user]);

  if (loading || (user && isBroker === null)) {
    return <ThemeProvider><Spinner /></ThemeProvider>;
  }

  if (!user) {
    return <ThemeProvider><ToastProvider><Login /></ToastProvider></ThemeProvider>;
  }

  if (user && isBroker && bankVerified === false) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <BankVerification onVerified={() => setBankVerified(true)} />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/earnings"    element={<Earnings />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/Login.tsx sales/src/App.tsx
git commit -m "feat: Login page + App.tsx routing with bank verification gate"
```

---

## Task 5: Bank verification screen

**Files:**
- Create: `sales/src/pages/BankVerification.tsx`

- [ ] **Create `sales/src/pages/BankVerification.tsx`:**

```typescript
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import useSWR from 'swr';

interface Props {
  onVerified: () => void;
}

export default function BankVerification({ onVerified }: Props) {
  const toast = useToast();
  const [verifying, setVerifying] = useState(false);

  const { data: profile } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json();
  });

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await brokerFetch('/api/broker/verify-bank', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Bank details verified');
      onVerified();
    } catch (err: any) {
      toast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Verify your bank details</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Please confirm the details below before accessing the portal. Once verified, payouts will be sent to this account.
            </p>
          </div>

          {profile ? (
            <dl className="space-y-3">
              {[
                { label: 'Account Number', value: profile.bankAccountNumber ?? 'Not set' },
                { label: 'IFSC Code', value: profile.bankIfsc ?? 'Not set' },
                { label: 'UPI ID', value: profile.upiId ?? 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded" />)}
            </div>
          )}

          {profile && !profile.bankAccountNumber && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Bank details not set yet. Contact your TapLab admin to add your bank account.
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={handleVerify}
              disabled={verifying || !profile?.bankAccountNumber}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {verifying ? 'Verifying…' : 'Confirm & Continue'}
            </button>
            <button
              onClick={() => signOut(auth)}
              className="w-full py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/BankVerification.tsx
git commit -m "feat: BankVerification first-login gate"
```

---

## Task 6: Dashboard page

**Files:**
- Create: `sales/src/pages/Dashboard.tsx`

- [ ] **Create `sales/src/pages/Dashboard.tsx`:**

```typescript
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

interface DashboardData {
  dealsThisMonth: number;
  commissionThisMonth: number;
  streakBonusThisMonth: number;
  nextTier: { fromDeal: number; bonusAmount: number; dealsNeeded: number } | null;
  pendingLeadsCount: number;
  allTimeDeals: number;
  allTimeEarnings: number;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useSWR('/api/broker/dashboard', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<DashboardData>;
  });

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="max-w-2xl space-y-5">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const earningsThisMonth = data.commissionThisMonth + data.streakBonusThisMonth;

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your performance this month</p>
        </div>

        {/* Streak progress */}
        {data.nextTier && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {data.nextTier.dealsNeeded} more deal{data.nextTier.dealsNeeded !== 1 ? 's' : ''} this month to unlock a{' '}
              <span className="font-bold">{inr(data.nextTier.bonusAmount)} streak bonus</span> per deal
            </p>
          </div>
        )}

        {/* This month stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">This Month</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Deals Closed', value: data.dealsThisMonth.toString() },
              { label: 'Total Earnings', value: inr(earningsThisMonth) },
              { label: 'Commission', value: inr(data.commissionThisMonth) },
              { label: 'Streak Bonuses', value: inr(data.streakBonusThisMonth) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All time stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">All Time</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Deals', value: data.allTimeDeals.toString() },
              { label: 'Total Earnings', value: inr(data.allTimeEarnings) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/submissions')}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Submit New Lead
          </button>
          {data.pendingLeadsCount > 0 && (
            <button
              onClick={() => navigate('/submissions')}
              className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {data.pendingLeadsCount} pending
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Commit:**
```bash
git add sales/src/pages/Dashboard.tsx
git commit -m "feat: Dashboard with streak progress + monthly stats"
```

---

## Task 7: Submissions page (leads + referrals)

**Files:**
- Create: `sales/src/pages/Submissions.tsx`
- Create: `sales/src/pages/SubmitLead.tsx`
- Create: `sales/src/pages/SubmitReferral.tsx`

- [ ] **Create `sales/src/pages/SubmitLead.tsx`:**

```typescript
import { useState } from 'react';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function SubmitLead({ onSuccess, onCancel }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    businessName: '', businessSlug: '', ownerName: '', ownerPhone: '', ownerEmail: '',
    pricingAmount: 999, billingCycle: 'monthly' as 'monthly' | 'yearly',
    setupFee: 0, commissionPercent: 10, freeTrialEnabled: false, trialDurationDays: 7,
  });
  const [saving, setSaving] = useState(false);

  const handleSlug = (val: string) => setForm({ ...form, businessSlug: val.toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, '') });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/leads', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Lead submitted');
      onSuccess();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Client Lead</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business Name</label>
          <input required type="text" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Pizza Palace" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input required type="text" value={form.businessSlug} onChange={(e) => handleSlug(e.target.value)} placeholder="pizza_palace" className={inputClass} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">taplab.in/{form.businessSlug || 'slug'}</p>
        </div>
        <div>
          <label className={labelClass}>Owner Name</label>
          <input required type="text" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Owner Phone</label>
          <input required type="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Owner Email <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(optional)</span></label>
          <input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Pricing (₹/month or year)</label>
          <input required type="number" value={form.pricingAmount} onChange={(e) => setForm({ ...form, pricingAmount: parseInt(e.target.value) || 0 })} min="1" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Billing Cycle</label>
          <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as 'monthly' | 'yearly' })} className={inputClass}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Setup Fee (₹)</label>
          <input type="number" value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: parseInt(e.target.value) || 0 })} min="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Commission %</label>
          <input required type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" step="0.5" className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.freeTrialEnabled}
          onClick={() => setForm({ ...form, freeTrialEnabled: !form.freeTrialEnabled })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.freeTrialEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.freeTrialEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">Free Trial</span>
      </div>

      {form.freeTrialEnabled && (
        <div>
          <label className={labelClass}>Trial Duration (days)</label>
          <input type="number" value={form.trialDurationDays} onChange={(e) => setForm({ ...form, trialDurationDays: parseInt(e.target.value) || 7 })} min="1" className={inputClass} />
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Submitting…' : 'Submit Lead'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Create `sales/src/pages/SubmitReferral.tsx`:**

```typescript
import { useState } from 'react';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass = 'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function SubmitReferral({ onSuccess, onCancel }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await brokerFetch('/api/broker/referrals', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Referral submitted');
      onSuccess();
    } catch (err: any) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Refer a Broker</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500">Know someone who would make a great TapLab sales partner? Send us their details.</p>
      <div>
        <label className={labelClass}>Full Name</label>
        <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Submitting…' : 'Submit Referral'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Create `sales/src/pages/Submissions.tsx`:**

```typescript
import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import SubmitLead from './SubmitLead';
import SubmitReferral from './SubmitReferral';

type MainTab = 'clients' | 'brokers';
type LeadStatus = 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<LeadStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
};

export default function Submissions() {
  const [tab, setTab] = useState<MainTab>('clients');
  const [showForm, setShowForm] = useState(false);

  const { data: leads, mutate: mutateLeads } = useSWR('/api/broker/leads', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).leads as any[];
  });

  const { data: referrals, mutate: mutateReferrals } = useSWR('/api/broker/referrals', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).referrals as any[];
  });

  const tabBtn = (t: MainTab, label: string) => (
    <button
      onClick={() => { setTab(t); setShowForm(false); }}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Submissions</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Track all your submitted leads and referrals</p>
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

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {tabBtn('clients', 'Clients')}
          {tabBtn('brokers', 'Brokers')}
        </div>

        {showForm && tab === 'clients' && (
          <SubmitLead onSuccess={() => { setShowForm(false); mutateLeads(); }} onCancel={() => setShowForm(false)} />
        )}
        {showForm && tab === 'brokers' && (
          <SubmitReferral onSuccess={() => { setShowForm(false); mutateReferrals(); }} onCancel={() => setShowForm(false)} />
        )}

        {tab === 'clients' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {!leads ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[1, 2].map((i) => <div key={i} className="px-5 py-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" /></div>)}
              </div>
            ) : leads.length === 0 ? (
              <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No leads submitted yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads.map((lead: any) => (
                  <div key={lead.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.businessName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[lead.status as LeadStatus]}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      ₹{lead.pricingAmount?.toLocaleString('en-IN')}/{lead.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      {lead.setupFee > 0 ? ` + ₹${lead.setupFee.toLocaleString('en-IN')} setup` : ''}
                    </p>
                    {lead.status === 'rejected' && lead.rejectionReason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{lead.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'brokers' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {!referrals ? (
              <div className="px-5 py-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
            ) : referrals.length === 0 ? (
              <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No broker referrals yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {referrals.map((r: any) => (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.phone} · {r.email}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[r.status as LeadStatus] ?? STATUS_COLORS.pending}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
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
git add sales/src/pages/Submissions.tsx sales/src/pages/SubmitLead.tsx sales/src/pages/SubmitReferral.tsx
git commit -m "feat: Submissions page with lead + referral forms"
```

---

## Task 8: Leaderboard + Earnings pages

**Files:**
- Create: `sales/src/pages/Leaderboard.tsx`
- Create: `sales/src/pages/Earnings.tsx`

- [ ] **Create `sales/src/pages/Leaderboard.tsx`:**

```typescript
import { useState } from 'react';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { auth } from '../lib/firebase';

export default function Leaderboard() {
  const [tab, setTab] = useState<'monthly' | 'allTime'>('monthly');
  const currentUid = auth.currentUser?.uid;

  const { data } = useSWR('/api/broker/leaderboard', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{
      monthly: { brokerId: string; name: string; dealsThisMonth: number; dealsAllTime: number }[];
      allTime: { brokerId: string; name: string; dealsThisMonth: number; dealsAllTime: number }[];
    }>;
  });

  const { data: me } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{ id: string }>;
  });

  const rows = data ? (tab === 'monthly' ? data.monthly : data.allTime) : null;
  const myId = me?.id;

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Rankings across the sales network</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {(['monthly', 'allTime'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!rows ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <Skeleton className="w-7 h-5" />
                  <Skeleton className="h-4 flex-1 max-w-[150px]" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row, i) => {
                const isMe = row.brokerId === myId;
                const count = tab === 'monthly' ? row.dealsThisMonth : row.dealsAllTime;
                return (
                  <div key={row.brokerId} className={`flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                    <span className={`text-sm font-bold w-7 text-center ${i < 3 ? ['text-yellow-500', 'text-gray-400', 'text-amber-600'][i] : 'text-gray-400 dark:text-gray-600'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <span className={`text-sm font-medium flex-1 ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                      {row.name}{isMe ? ' (you)' : ''}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {count} deal{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Create `sales/src/pages/Earnings.tsx`:**

```typescript
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Earnings() {
  const { data } = useSWR('/api/broker/earnings', async (url) => {
    const res = await brokerFetch(url);
    return res.json() as Promise<{
      earnings: { slug: string; businessName: string; commissionAmount: number; commissionPaidAt: any; streakBonus: number | null; streakBonusPaidAt: any }[];
      totalEarnings: number;
    }>;
  });

  return (
    <Layout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">All payouts received from TapLab</p>
        </div>

        {/* Total */}
        {data && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inr(data.totalEarnings)}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!data ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : data.earnings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No payouts yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Payouts appear here once a client subscribes.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.earnings.map((e) => (
                <div key={e.slug} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.businessName}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {inr((e.commissionAmount ?? 0) + (e.streakBonus ?? 0))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Commission {inr(e.commissionAmount ?? 0)}
                      {e.streakBonus ? ` + ${inr(e.streakBonus)} streak bonus` : ''}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(e.commissionPaidAt)}</p>
                  </div>
                </div>
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
git add sales/src/pages/Leaderboard.tsx sales/src/pages/Earnings.tsx
git commit -m "feat: Leaderboard and Earnings pages"
```

---

## Task 9: Build, verify, and Netlify setup

- [ ] **Final build check:**
```bash
cd sales && npm run build
```
Expected: no TypeScript errors, dist/ folder created

- [ ] **Run dev server and test locally with a broker account:**
```bash
npm run dev
```
Navigate to `http://localhost:5173` — should show login screen. Log in with a broker account created via the admin panel. Should gate on bank verification, then show dashboard.

- [ ] **Deploy to Netlify** — create a new Netlify site pointing to the `sales/` subdirectory:
  - Build command: `npm run build`
  - Publish directory: `sales/dist`
  - Base directory: `sales`
  - Set custom domain: `sales.taplab.in`
  - Add same env vars as portal (Firebase config via `VITE_*`)

- [ ] **Add `sales.taplab.in` to Railway ALLOWED_ORIGINS** env var (comma-separated alongside existing origins)

- [ ] **Commit any final tweaks:**
```bash
git add sales/
git commit -m "feat: sales portal complete — ready for Netlify deploy"
```
