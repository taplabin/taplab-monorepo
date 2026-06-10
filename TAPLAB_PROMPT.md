# TapLab Page Conversion Guide

## Session start — intake before generation

When this guide is pasted without a slug, business name, or page type already provided, do not generate any code. Ask the following questions first and wait for all answers before proceeding:

1. **What type of page is this?**
   - Menu (restaurant / café / bar)
   - Portfolio (freelancer / studio / agency)
   - Brochure (business / service / product)
   - Other — describe it briefly

2. **What is the business name?**

3. **What is the slug?** (hyphenated lowercase, e.g. `blue-tokai`, `the-gluck`)

4. **Do you have images or a written description of the content to work from?**
   Upload images or paste the description after answering.

Once all four are answered and content is provided, generate `App.tsx` and `content.ts` only. Do not output any other files.

This document tells you everything you need to output a TapLab-ready page from any business (images or description). Read it fully before generating any code.

**These pages are accessed by tapping an NFC card with a phone, but also viewed on desktop.** Design responsively for both. Do NOT set a `max-width` on the root page wrapper — let it fill the full viewport width. You may use `max-width` on inner content columns (e.g. a centered `max-w-2xl` card) to keep desktop layouts readable, but the page background and header must always span full width.

---

## What you must output

Two files only:

- `src/App.tsx` — the full React component
- `src/content.ts` — all editable text fields as a flat key-value map

Do not output `main.tsx`, `package.json`, or any config files. Those are already handled.

---

## How TapLab pages work

- Each page is a React + Tailwind component that lives inside a Web Component (Shadow DOM).
- On mount, it fetches live content from `https://api.taplab.in/page/{slug}/content` and merges it over `defaultContent`.
- `defaultContent` in `content.ts` is the source of truth for all text. Every visible string on the page must come from a content key, not be hardcoded.
- The customer can edit content keys through the portal. Keep key names short, lowercase, and underscore-separated.

---

## App.tsx — exact pattern to follow

```tsx
import { useState, useEffect } from 'react';
import { defaultContent } from './content';

const API_BASE = 'https://api.taplab.in';
const ANALYTICS_URL = 'https://poop.taplab.in';

export default function App({ slug }: { slug: string }) {
  const [content, setContent] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/page/${slug}/content`)
      .then((r) => r.json())
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => setContent(defaultContent));
  }, [slug]);

  // Do NOT initialize state with defaultContent — that causes a flash of stale
  // bundle content before the fetch resolves. Start null, render nothing until
  // fresh data arrives. defaultContent is only used as a fallback on fetch error.
  if (!content) return null;

  // render using content.some_key — never hardcode visible text
  return ( ... );
}
```

If the page has structured list data (e.g. menu items), add `useMemo` to parse it:

```tsx
import { useState, useEffect, useMemo } from 'react';

// inside the component (use optional chaining — content is null before fetch resolves):
const pageData = useMemo(() => {
  try { return JSON.parse(content?.page_data ?? '{}'); }
  catch { return {}; }
}, [content?.page_data]);
```

---

## Analytics — tracking page visits and sessions

Every page must fire two analytics events. Add both `useEffect` blocks below. Do not merge them.

### 1. Pageview event — fires once on content load

```tsx
useEffect(() => {
  // Returning visitor detection via localStorage
  const isReturning = !!localStorage.getItem('taplab_v');
  if (!isReturning) localStorage.setItem('taplab_v', '1');

  // UTM campaign parameters from URL
  const params = new URLSearchParams(window.location.search);

  fetch(`${API_BASE}/page/${slug}/content`)
    .then((r) => r.json())
    .then((data) => {
      setContent({ ...defaultContent, ...data });

      // Fire pageview event after content loads — nested so it only fires on real renders
      fetch(`${ANALYTICS_URL}/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId:  slug,
          referrer:    document.referrer,
          screenWidth: window.screen.width,
          language:    navigator.language,
          returning:   isReturning,
          utmSource:   params.get('utm_source')   ?? 'none',
          utmMedium:   params.get('utm_medium')   ?? 'none',
          utmCampaign: params.get('utm_campaign') ?? 'none',
        }),
      }).catch(() => {}); // fail silently — never break the page over analytics
    })
    .catch(() => setContent(defaultContent));
}, [slug]);
```

### 2. Session duration event — fires when user leaves

```tsx
useEffect(() => {
  const startTime = Date.now();
  let sent = false;

  function sendSession() {
    if (sent) return;
    sent = true;
    const duration = Math.round((Date.now() - startTime) / 1000);
    fetch(`${ANALYTICS_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: slug, duration }),
        keepalive: true,
      }).catch(() => {});
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') sendSession();
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', sendSession);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('beforeunload', sendSession);
  };
}, []); // empty deps — set up once on mount
```

### Rules:
- Always nest the pageview `fetch` inside the content `.then()` — guarantees it only fires after a real render, not on fetch error fallbacks
- Always `.catch(() => {})` the pageview fetch — a failed analytics call must never affect the user
- Use `fetch` with `keepalive: true` for the session event — it fires reliably during page unload and is not blocked by ad blockers the way `sendBeacon` is
- Never `await` either analytics call or block rendering on them
- Do not add any of these fields to `content.ts` — they are structural, not editable

---

## content.ts — exact pattern to follow

```ts
export const defaultContent: Record<string, string> = {
  brand_name: 'Business Name',
  tagline: 'Short tagline here',
  // one key per editable field
};
```

All values must be strings. Numbers become `'299'`, booleans become `'true'` / `'false'` if used as standalone keys.

---

## Rules for deciding what goes in content.ts

### Always include as individual flat keys:
- Business name, tagline, cuisine type line
- Any notice, label, or short string the business might want to change (e.g. `'Extra Sauces — ₹39'`, `'We do not levy service charge'`)
- Footer copyright line
- Section headers or labels that are business-specific
- Prices that appear as standalone text

### Store as a single JSON string key (`page_data`):
Use this when the page has a list of structured items — menu items, portfolio projects, services, team members, etc. — where each item has multiple fields.

The shape inside the JSON depends on the page type:

**Menu:**
```ts
const items = {
  starters: { label: 'STARTERS', items: [{ name: '', price: '', description: '', veg: true }] },
  mains:    { label: 'MAINS',    items: [...] },
};
page_data: JSON.stringify(items)
```

**Portfolio:**
```ts
const items = [
  { title: '', category: '', description: '', year: '' },
];
page_data: JSON.stringify(items)
```

**Brochure:**
```ts
const items = [
  { heading: '', body: '', icon: '' },
];
page_data: JSON.stringify(items)
```

In `App.tsx`, parse it back with `useMemo` and use the typed result to render.

### Leave hardcoded (do NOT put in content.ts):
- Structural UI labels that are not business-specific: filter button labels (`'All'`, `'Veg'`, `'Non-Veg'`), item count display (`'{n} items'`)
- Emoji used as pure UI indicators (🟢 🔴) — not as part of a business string
- The `'Powered by Taplab'` footer credit
- CSS class names, inline style values, SVG data URIs

---

## Naming conventions

| Thing | Format | Example |
|---|---|---|
| Content key | `snake_case` | `brand_name`, `page_data` |
| Slug (hyphenated) | `kebab-case` | `the-gluck` |
| SLUG constant | `snake_case` | `the_gluck` |
| TAG_NAME | `taplab-page-{slug}` | `taplab-page-the-gluck` |

---

## Checklist before handing off the files

- [ ] Every visible string on the page comes from `content.someKey`
- [ ] `defaultContent` has all keys that `App.tsx` references
- [ ] Structured list data is stored as `JSON.stringify(...)` in one key
- [ ] `App.tsx` exports `default function App({ slug }: { slug: string })`
- [ ] No `"use client"` directive (this is not Next.js)
- [ ] No imports from `next/*`, `next/navigation`, etc.
- [ ] Tailwind classes only — no CSS modules, no styled-components
- [ ] `useEffect` fetches from `https://api.taplab.in/page/${slug}/content`
- [ ] `useState` initializes to `null`, not `defaultContent` — `if (!content) return null` guards the render
- [ ] Content `useEffect` fires `${ANALYTICS_URL}/pageview` inside the `.then()` with returning + UTM fields
- [ ] Separate session `useEffect` with `[]` deps sets up `visibilitychange` + `beforeunload` using `fetch` with `keepalive: true`

## Page type conventions

The visual structure and `page_data` shape vary by page type. Always match the layout to the type confirmed in the intake.

**Menu pages:**
- Header with brand name, cuisine type, tagline
- Category tabs or filter buttons (Veg / Non-Veg / All)
- Item cards with name, price, description, veg indicator
- Footer with notice (e.g. no service charge) and Powered by TapLab

**Portfolio pages:**
- Hero with name, role, one-line bio
- Project grid or list with title, category, year, description
- Optional contact section with links
- No filter UI unless explicitly requested

**Brochure pages:**
- Hero with business name, tagline, CTA
- Service or feature cards from `page_data`
- Optional testimonial or stat section (flat keys in content.ts)
- Contact or location section at bottom

For **Other** page types: use judgment based on the description given in intake. Follow all the same rules — flat keys for standalone strings, `page_data` for structured lists.
