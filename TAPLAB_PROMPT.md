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

4. **Do you have reference material for the design?**
   Upload photos of the physical menu, interior, or any inspiration images. These are for design reference only — to inform the colour palette, layout style, and overall feel. They do not appear on the page.

5. **Will this page display any images** (hero photo, logo, food photography, team photo, etc.)?
   - If **no** — skip this question.
   - If **yes** — these must be uploaded to the R2 bucket at `media.taplab.in` before you provide them here. Once uploaded, list each one in this format:
     ```
     hero_image: https://media.taplab.in/slug/hero.jpg
     logo_image: https://media.taplab.in/slug/logo.png
     ```
   Use descriptive key names ending in `_image` (or `_video` for video). These will become content keys in `content.ts` and `<img>` tags in `App.tsx`.

Once all questions are answered and content is provided, generate `App.tsx` and `content.ts` only. Do not output any other files.

This document tells you everything you need to output a TapLab-ready page from any business. Read it fully before generating any code.

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

If the page has structured list data (e.g. menu items), add `useMemo` to parse it. Use the type-specific key name — `menu_data` for menus, `portfolio_data` for portfolios, `brochure_data` for brochures:

```tsx
import { useState, useEffect, useMemo } from 'react';

// inside the component (use optional chaining — content is null before fetch resolves):
const menuData = useMemo(() => {
  try { return JSON.parse(content?.menu_data ?? '{}'); }
  catch { return {}; }
}, [content?.menu_data]);
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

      // Fire pageview event after content loads — skip in dev so localhost visits don't pollute analytics
      if (!import.meta.env.DEV) {
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
      }
    })
    .catch(() => setContent(defaultContent));
}, [slug]);
```

### 2. Session duration event — fires when user leaves

```tsx
useEffect(() => {
  if (import.meta.env.DEV) return; // skip in development

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

### What is and isn't customer-editable

The portal editor only surfaces **structured data keys** (`menu_data`, `portfolio_data`, `brochure_data`). Everything else in `content.ts` is **set at deploy time and is not editable by the customer** — changing it requires updating `content.ts` and running a redeploy.

| Key type | Editable by customer? | How to change |
|---|---|---|
| `menu_data` / `portfolio_data` / `brochure_data` | ✅ Yes — visual editor in portal | Customer edits in portal and saves |
| Flat keys (`brand_name`, `phone`, `address`, etc.) | ❌ No | Update `content.ts` → redeploy |
| Image / video keys (`hero_image`, etc.) | ❌ No | Upload new file to R2 → update URL in `content.ts` → redeploy |

### Always include as individual flat keys:
Every piece of info that is NOT a structured list must be a flat string key — never a nested object. Even though these aren't customer-editable, keeping them as individual flat keys makes them easy to reference in `App.tsx` and easy to update during a redeploy.

Use these standard key names whenever the field applies — do not invent variations:

| Field | Key name |
|---|---|
| Business / brand name | `brand_name` |
| Tagline or slogan | `tagline` |
| Cuisine or category type | `cuisine_type` |
| Phone number | `phone` |
| WhatsApp number | `whatsapp` |
| Email address | `email` |
| Physical address | `address` |
| Opening hours (as a single string) | `hours` |
| Instagram URL | `instagram_url` |
| Website URL | `website_url` |
| Footer copyright line | `footer_copy` |
| Any notice or disclaimer | `notice` |
| Hero / banner image | `hero_image` |
| Logo image | `logo_image` |
| Any other image | `{descriptor}_image` (e.g. `banner_image`, `team_image`) |
| Any video | `{descriptor}_video` (e.g. `promo_video`) |

Add extra flat keys as needed for page-specific strings. Keep names lowercase and snake_case. Every flat key must be a plain string value — never a number, boolean, array, or object.

### Store as a type-specific JSON string key:
Use this when the page has structured list data. The key name is fixed by page type — do not use `page_data` or any other invented name. The portal editor uses the key name to decide which visual editor to render, so the name must be exact.

**Menu pages → key must be `menu_data`**

Use the exact structure below. This is the canonical production format used across all TapLab menu pages.

```ts
const menuData = {
  category_key: {                          // lowercase snake_case key, e.g. starters, main_course
    label: 'CATEGORY NAME',               // display label shown on the page
    priceNote: '4PC / 6PC',              // optional — omit if not needed
    items: [
      {
        name: 'Item Name',
        price: '299',                     // always a string; use '289 / 369' for range prices
        description: 'Description of the item.',
        veg: true,                        // boolean: true = veg, false = non-veg
      },
    ],
  },
  // add more categories as needed
};

export const defaultContent: Record<string, string> = {
  // ... flat keys ...
  menu_data: JSON.stringify(menuData),
};
```

Rules:
- Category keys: lowercase `snake_case` only (e.g. `cold_drinks`, `main_course`)
- Every item must have exactly these four fields: `name`, `price`, `description`, `veg` — no extras
- `veg: true` for vegetarian/vegan; `veg: false` for non-veg; use `true` for ambiguous items (desserts, drinks) unless clearly meat-based
- `priceNote` is optional — only add it if the category genuinely has a pricing note

**Portfolio pages → key must be `portfolio_data`**

```ts
const portfolioData = [
  {
    title: 'Project Name',
    category: 'Category',          // e.g. Branding, Web Design, Photography
    description: 'Short description of the project.',
    year: '2024',
  },
];

portfolio_data: JSON.stringify(portfolioData)
```

Every item must have exactly: `title`, `category`, `description`, `year` — no extra fields.

**Brochure pages → key must be `brochure_data`**

```ts
const brochureData = [
  {
    heading: 'Feature or Service Name',
    body: 'One or two sentence description.',
    icon: '✦',                     // a single emoji or symbol
  },
];

brochure_data: JSON.stringify(brochureData)
```

Every item must have exactly: `heading`, `body`, `icon` — no extra fields.

In `App.tsx`, parse it back with `useMemo` using the correct key name for the page type.

### Image and video keys

Any key ending in `_image` or `_video` holds a full public URL pointing to Cloudflare R2 (`media.taplab.in`). Images are uploaded manually to R2 per client — they do not live inside the JS bundle.

**Naming:** always `{descriptor}_image` or `{descriptor}_video`, lowercase snake_case.

**Value in `content.ts`:** always a full `https://` URL — never a relative path.
```ts
hero_image: 'https://media.taplab.in/the-gluck/hero.jpg',
logo_image: 'https://media.taplab.in/the-gluck/logo.png',
```

**Rendering in `App.tsx`:**
```tsx
{content.hero_image && (
  <img src={content.hero_image} alt={content.brand_name} className="w-full object-cover" />
)}
{content.promo_video && (
  <video src={content.promo_video} autoPlay muted loop playsInline className="w-full" />
)}
```

Rules:
- Always guard with `{content.hero_image && ...}` — the field may be empty if the client hasn't uploaded yet
- Never use `<img src="/some-local-path" />` — all images must be full R2 URLs
- `alt` text should reference a content key (e.g. `alt={content.brand_name}`) — never hardcode
- Images work identically in `npm run dev` and production because R2 is a public URL in both cases

### Leave hardcoded (do NOT put in content.ts):
- Structural UI labels that are not business-specific: filter button labels (`'All'`, `'Veg'`, `'Non-Veg'`), item count display (`'{n} items'`)
- Emoji used as pure UI indicators (🟢 🔴) — not as part of a business string
- The `'Powered by Taplab'` footer credit
- CSS class names, inline style values, SVG data URIs

---

## Naming conventions

| Thing | Format | Example |
|---|---|---|
| Content key | `snake_case` | `brand_name`, `menu_data`, `portfolio_data` |
| Slug (hyphenated) | `kebab-case` | `the-gluck` |
| SLUG constant | `snake_case` | `the_gluck` |
| TAG_NAME | `taplab-page-{slug}` | `taplab-page-the-gluck` |

---

## Checklist before handing off the files

- [ ] Every visible string on the page comes from `content.someKey`
- [ ] Image keys end in `_image`, video keys end in `_video`, values are full `https://media.taplab.in/{slug}/...` URLs
- [ ] Image/video tags are guarded with `{content.hero_image && ...}` — never render a broken `<img src="" />`
- [ ] `defaultContent` has all keys that `App.tsx` references
- [ ] Structured list data uses the correct type-specific key: `menu_data` / `portfolio_data` / `brochure_data` — never `page_data`
- [ ] The JSON shape inside that key matches exactly the structure defined in this guide — no extra or missing fields
- [ ] `App.tsx` exports `default function App({ slug }: { slug: string })`
- [ ] No `"use client"` directive (this is not Next.js)
- [ ] No imports from `next/*`, `next/navigation`, etc.
- [ ] Tailwind classes only — no CSS modules, no styled-components
- [ ] `useEffect` fetches from `https://api.taplab.in/page/${slug}/content`
- [ ] `useState` initializes to `null`, not `defaultContent` — `if (!content) return null` guards the render
- [ ] Content `useEffect` fires `${ANALYTICS_URL}/pageview` inside the `.then()`, wrapped in `if (!import.meta.env.DEV)`, with returning + UTM fields
- [ ] Separate session `useEffect` with `[]` deps starts with `if (import.meta.env.DEV) return;`, then sets up `visibilitychange` + `beforeunload` using `fetch` with `keepalive: true`

## Page type conventions

The visual structure and structured data key vary by page type. Always match the layout to the type confirmed in the intake.

**Menu pages:**
- Header with brand name, cuisine type, tagline
- Category tabs or filter buttons (Veg / Non-Veg / All)
- Item cards with name, price, description, veg indicator
- Footer with notice (e.g. no service charge) and Powered by TapLab
- **Never hardcode a `CATEGORY_ORDER` array.** Always derive the category list dynamically: `const categories = Object.keys(menuData)`. This ensures sections added later through the portal editor appear on the live page without a redeploy.

**Portfolio pages:**
- Hero with name, role, one-line bio
- Project grid or list with title, category, year, description
- Optional contact section with links
- No filter UI unless explicitly requested

**Brochure pages:**
- Hero with business name, tagline, CTA
- Service or feature cards from `brochure_data`
- Optional testimonial or stat section (flat keys in content.ts)
- Contact or location section at bottom

For **Other** page types: use judgment based on the description given in intake. Follow all the same rules — flat keys for standalone strings, a descriptive `_data` key (e.g. `schedule_data`, `links_data`) for structured lists.
