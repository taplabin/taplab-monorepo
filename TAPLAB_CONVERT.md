# TapLab Page Conversion Guide

This document tells you everything you need to output a TapLab-ready page from a restaurant menu (images or description). Read it fully before generating any code.

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
const menuData = useMemo(() => {
  try { return JSON.parse(content?.menu_data ?? '{}'); }
  catch { return {}; }
}, [content?.menu_data]);
```

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

### Store as a single JSON string key (`menu_data`):
Use this when the page has a **list of structured items** (menu items, products, services, team members, etc.) where each item has multiple fields (name, price, description, and so on).

```ts
const items = [
  { name: 'Margherita', price: '299', description: '...', veg: true },
  // ...
];

export const defaultContent: Record<string, string> = {
  // ...flat keys...
  menu_data: JSON.stringify(items),
};
```

In `App.tsx`, parse it back with `useMemo` and use the typed result to render.

If items are grouped into categories (e.g. Starters / Mains / Desserts), use an object keyed by category:

```ts
const menuData = {
  starters: { label: 'STARTERS', items: [...] },
  mains:    { label: 'MAINS',    items: [...] },
};
// menu_data: JSON.stringify(menuData)
```

### Leave hardcoded (do NOT put in content.ts):
- Structural UI labels that are not business-specific: filter button labels (`'All'`, `'Veg'`, `'Non-Veg'`), item count display (`'{n} items'`)
- Emoji used as pure UI indicators (🟢 🔴) — not as part of a business string
- The `'Powered by Taplab'` footer credit
- CSS class names, inline style values, SVG data URIs

---

## Handling common menu page patterns

### Veg / Non-Veg indicator
Store `veg: true/false` inside the JSON structure (not as individual string keys). Render it as a colored dot in JSX — do not put it in `content.ts`.

### Prices with size variants (e.g. "289 / 369" for 4pc / 6pc)
Store price as a string: `price: '289 / 369'`. Store the size note as a string too: `priceNote: '4PC / 6PC'`. Both go inside the JSON structure.

### Multiple categories with filtered views
Use the JSON object approach above. Track `activeCategory` and `filter` as React state — these are UI state, not content.

### Google Fonts
Keep the `@import` inside a `<style>` tag in JSX. Do not put font names in `content.ts`.

### Inline CSS-in-JS styles
Keep them in JSX. Do not put hex colors or pixel values in `content.ts`.

---

## Naming conventions

| Thing | Format | Example |
|---|---|---|
| Content key | `snake_case` | `brand_name`, `menu_data` |
| Slug (hyphenated) | `kebab-case` | `the-gluck` |
| SLUG constant | `snake_case` | `the_gluck` |
| TAG_NAME | `taplab-page-{slug}` | `taplab-page-the-gluck` |

---

## What to tell Claude at the start of each session

Paste this guide, then add:

> Slug: `{slug}`. Business name: `"{Business Name}"`. Here are the menu card images. Generate `App.tsx` and `content.ts` for this TapLab page. Match the visual design to what's shown in the images. Do not output any other files.

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
