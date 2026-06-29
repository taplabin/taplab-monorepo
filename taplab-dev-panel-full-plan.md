# TapLab — The Dev Panel & How All Four Panels Connect

## What this document is

This is the full picture of how TapLab's four panels — **Broker**, **Admin**, **Dev**, and **Customer** — connect into one pipeline, with the new Dev Panel slotted in properly rather than bolted on as a separate thing. It also captures every problem we identified and the agreed solution for each, plus what's intentionally left for later, and one open question that still needs an answer before building.

---

## 1. The big picture — one pipeline, four panels

TapLab isn't four separate tools. It's one pipeline, and each panel is where a different person does their part of it.

```
Broker Panel          Admin Panel           Dev Panel            Customer Panel
    │                      │                     │                     │
 Closes deal      →   Approves deal       →  Builds page      →   Edits content
                          │                      │                  views analytics
                          │                      │
                     Approves staging            │
                     build → sends            (after payment)
                     Razorpay link
                          │
                     Payment webhook
                     fires → page goes live
                     → broker gets paid
```

The entity chain underneath all four panels is:

**Broker → Deal → Job → Build → Approval → Customer → Subscription → Live Website**

Every panel is just a window onto a different stage of that same chain. This is the same connective pattern that already exists between Broker → Admin today — we're extending it forward into Dev, instead of inventing something separate.

---

## 2. Panel-by-panel: what each one does, and how it hands off to the next

### Broker Panel (existing)
- Broker closes a deal in person/by phone with a business.
- Submits: business name, slug, page type (menu/portfolio/brochure/other), agreed setup + subscription price, billing cycle, broker ID, and raw materials (menu photos, reference images, logo).
- **Hands off to:** Admin Panel, as a pending submission awaiting approval.

### Admin Panel (existing, gets one new responsibility)
- You review the broker's submission — edit details, reject, or approve.
- **New responsibility:** approving the deal is what creates the **Job** record — this happens immediately, before any code exists, with status `queued`. This is earlier than today's flow, where the Firestore record only gets created right before deploy.
- Later in the chain, Admin is also where you approve a staging build and trigger the Razorpay link + CMS portal reset-password link to the customer (same as today).
- **Hands off to:** Dev Panel (the job enters the open queue) and, later, the Customer (via the Razorpay + portal links).

### Dev Panel (new — the focus of this document)
- Developers self-claim open jobs, build the page, preview it, and push a build to staging.
- **Hands off to:** Admin Panel (a staging preview link, ready for your review/approval) — and, once paid, automatically to production.

### Customer Panel (existing)
- After payment, the customer resets their password and logs in.
- Edits structured content (`menu_data`/`portfolio_data`/`brochure_data`) through the visual editor, depending on page type.
- Views analytics: visits, unique visitors, peak times, device type, language, time on page.
- This panel is untouched by anything in this document — it picks up only once a page is live.

---

## 3. The Job lifecycle (the spine connecting all four panels)

**Statuses:** `queued` → `claimed` → `in_review` → `approved` → `live` (with `publish_pending` as a transient state if the final promotion step needs a retry, and jobs can sit at `approved` indefinitely if the customer never pays).

| Status | Who's responsible | What's happening |
|---|---|---|
| `queued` | Nobody yet | Admin approved the deal; job is visible in the open Dev Panel queue with materials attached |
| `claimed` | A developer | Self-claimed (decision made: **open queue, developers self-claim** — not direct assignment); hidden from all other developers the moment it's claimed |
| `in_review` | You | Developer pushed a validated build to staging; a preview link is ready for you to open and judge |
| `approved` | Waiting on customer | You approved the staging build; Razorpay + portal links sent; waiting for payment |
| `publish_pending` | System (automatic retry) | Payment succeeded but the staging→production copy hasn't confirmed yet — system retries automatically |
| `live` | Nobody — done | Page is live, broker payout queued, customer can log into their portal |

---

## 4. The Dev Panel — full detail

### Access
- Each developer gets their **own login** — not shared — so every job has a real "who built this" record.
- **Desktop only.** Below a set screen width, render nothing except a simple message asking them to open it on a laptop or desktop. No responsive design effort spent here.

### Queue view
- Lists every `queued` job: business name, page type, thumbnails of the broker's attached materials.
- Clicking "claim" flips it to `claimed`, attaches the developer's name, and removes it from everyone else's queue — this is what stops two developers from building the same job.

### Job detail view
- Shows the broker-submitted materials (photos, menu images, reference images) — downloadable/viewable so the developer can feed them into the `TAPLAB_PROMPT.md` Claude prompt, run separately as it is today.
- **Two text boxes only:** paste the resulting `App.tsx` and `content.ts`.
- **Image upload helper:** since the prompt requires images to already live at `media.taplab.in/{slug}/...`, the panel includes an upload button that sends the file to the main backend (which holds the real R2 media credential) and returns the public URL — the developer never touches R2 directly.

### Sandbox preview — free, instant, runs entirely in the browser
- Renders `App.tsx` directly against `defaultContent` from the pasted `content.ts` — no fetch needed, since `defaultContent` already holds real working values.
- Must render inside an **actual shadow root**, matching how the real Web Component isolates styles — otherwise the sandbox can look better than reality by accidentally inheriting styles from the dev panel page itself.
- Must **fake `import.meta.env.DEV` as `true`** — otherwise analytics code could throw, or worse, fire real pageview/session events from a developer's idle tinkering.
- Tailwind risk to be aware of: the sandbox likely resolves classes live (like Tailwind's Play CDN), while the real build only generates CSS for classes it can statically find in the source. A dynamically-built class name (e.g. a template string) can silently work in the sandbox and silently break in the real build. This is the most likely cause of any sandbox/staging mismatch.
- Can be re-run as many times as the developer wants — no backend call, no cost, at this stage.
- **Hard rule:** nobody approves or sends a link based on the sandbox. Only the staging link — the real build — counts as "this is what will actually go live."

### Automated validation — runs before any real build is attempted
Checks the pasted files against the rules already defined in `TAPLAB_PROMPT.md`, e.g.:
- Exactly the two expected files, correctly structured
- `App.tsx` exports `default function App({ slug }: { slug: string })`; no `"use client"`; no `next/*` imports
- Every key referenced in `App.tsx` exists in `defaultContent`
- The relevant `_data` key (`menu_data`/`portfolio_data`/`brochure_data`) parses as valid JSON with exactly the required fields per item
- `_image`/`_video` keys are full `https://media.taplab.in/...` URLs, never relative paths
- `useState` initializes to `null`, not `defaultContent`

If anything fails, the developer gets a specific, actionable error immediately — before anything is built, before any cost is spent.

### Push to staging
- Only enabled once validation passes — this is the one deliberate, rare action that costs real compute (unlike the free sandbox).
- Each push is saved as a **new version, not an overwrite**, with a **Build ID** attached (Build 1, Build 2, Build 3...) so you approve a specific build, not just "the job" — meaning if a later build is worse, you can re-approve an earlier one instead of being stuck with whatever's most recent.
- Each build also records metadata: prompt version used, template version used, which Claude model generated it, developer name, timestamp — so six months from now, if a page looks different than expected, you can answer "why" instead of guessing.
- On success: status moves to `in_review`, and a staging preview link is generated and shown in the panel.

---

## 5. The Build Service (new, separate Railway service)

**Why it's separate from the main backend:** the main backend handles Firestore, Razorpay/RazorpayX, and serving live customer pages — quick, light work. A real build (`npm install`/`vite build`-equivalent) is comparatively heavy, several seconds to a minute of CPU. Running that on the same small instance risks slowing down or blocking a payment webhook or a live customer page load at exactly the wrong moment. A separate service means a heavy or even crashed build can never take the main backend down with it.

**The "warm template" — why no cloning, no installing, every time:**
- The build service keeps one folder, sitting ready on disk, with the template already copied and all dependencies already installed — like a printing press that's already loaded and ready, where only the page being printed changes.
- On a build request: it makes a fast file-copy of that warm folder (seconds, not a minute, since nothing is downloaded), drops in the developer's two validated files, runs the real build, uploads the resulting bundle to staging, then deletes the temporary copy. The original warm folder stays untouched for the next job.

**Output:** only the resultant JS bundle leaves this service — nothing else gets stored or passed along.

**Credentials:** the build service holds only a write-only key scoped to the **staging** R2 bucket. It never has production R2, Cloudflare, or Razorpay credentials.

**Cost note:** adding this service doesn't double your Railway bill outright — Railway's $5 Hobby plan already includes $5 of usage credit across everything in the account. The real cost driver is whether this service sits idle 24/7 versus only spinning up to handle an actual build; keeping it from idling constantly is the main lever for keeping the added cost small.

---

## 6. Staging, preview links, and matching production

- A separate **staging R2 bucket**, distinct from production.
- Preview links use a short random token (e.g. `taplab.in/preview/business-name-x7f2a`) so an unpaid, unapproved draft can't be stumbled onto by guessing a URL.
- The staging build is the real build — same pipeline, same warm template, same output format as production — so "preview output looks just like the actual blob storage output" is true by construction, not by coincidence. The only difference between a staging bundle and a production bundle is *which bucket it's sitting in.*
- When approved and paid for, going live is a **copy**, not a rebuild — the exact same bundle file just gets copied from staging to production.

---

## 7. Deploy automation (the payment webhook)

- You approve a staging build → Razorpay link + CMS portal link generated and sent to customer (same as today).
- Razorpay's **payment-success webhook** is the only trigger that moves a bundle to production. On success, it:
  1. Copies the approved bundle from staging to production at the real path (`taplab.in/{business_name}`) — atomic, no rebuild.
  2. Updates the job/business record to `live`.
  3. Queues the broker's commission payout via RazorpayX — same event, two automatic outcomes.
- **Resilience:** if the staging→production copy fails (e.g. R2 briefly unreachable), status goes to `publish_pending` instead of silently failing or being confused with a payment failure. The system retries automatically; if it stays stuck past a reasonable point, it alerts you to step in manually.
- If the customer never pays, nothing above ever fires — the build just sits in staging, harmless, at effectively no ongoing cost. (Optional: an automatic nudge to the broker after a few days of no payment.)
- Production bundles are kept versioned (last N per slug) so rollback is repointing to a previous version, never a rebuild.

---

## 8. Security model

| Who | Has access to |
|---|---|
| Developer | Dev Panel login only — no git, no terminal, no R2, no Cloudflare, no Razorpay/RazorpayX credentials, no local `.env` sharing |
| Build service | Write-only key scoped to the **staging** R2 bucket only |
| Main backend (Railway) | Production R2, Cloudflare, Razorpay, RazorpayX credentials — the only place any of these live |
| Founder/Admin | Full override access for emergencies, same as today |

---

## 9. Deliberately deferred — backlog, not v1

These are real, agreed-on improvements — just not needed to launch the core loop:

- **Semantic validation** beyond structure — broken image links, duplicate menu items, bundle size limits, empty required fields. Add one check at a time, as a specific real failure actually happens — not all at once speculatively.
- **Admin preview annotations** — clicking directly on a staging preview to leave a note ("make this bigger") that the developer sees as a structured revision request, instead of Slack screenshots. Worth building once the core loop has been run a dozen times and the pain is concrete, not guessed at.

---

## 10. Decisions already made

- **Job claiming model: open queue, developers self-claim.** Not direct assignment by you.
- **No mobile view for the Dev Panel.** A simple "please open on a laptop" message below a set screen width — no responsive layout work spent here.

---

## 11. Open question — still needs an answer before validation rules are finalized

`TAPLAB_PROMPT.md` says Tailwind-only, no inline `<style>` tags. The current onboarding doc says style adjustments happen "inside the `<style>` tag of App.tsx." These disagree, and the validator can't be written until it's clear which is actually true.

**This might not be a stale-doc issue — it could be a real technical gap.** Because pages run inside a Shadow DOM Web Component (deliberately isolated from outside styles), Tailwind's compiled CSS has to be attached to that shadow root somehow. If that's already handled centrally by the Web Component wrapper, `App.tsx` never needed a `<style>` tag and the onboarding doc is just outdated. But if developers have been reaching for `<style>` to express something Tailwind can't — like a color value that comes dynamically from `content.ts` rather than being a fixed class — that's a real missing rule in the prompt, not a doc typo.

**To resolve it, ask Claude Code to:**
1. Look at the most recently generated `App.tsx` files (wherever the local project folders still exist) and report, for each: does it use Tailwind classes only, or does it have a `<style>` tag / inline `style={{}}` anywhere — and if so, was it for a fixed style choice or a value coming from `content.ts`.
2. Separately, check how the Web Component wrapper attaches CSS to the shadow root — is Tailwind's compiled stylesheet already injected there once, centrally, or is each page expected to bring its own.

Whichever answer comes back tells you exactly which doc to fix — delete the stale instruction, or add a real rule (e.g. "use inline `style={{ background: content.accent_color }}` only for values coming from a content key — never for anything static").

---

## Closing note

Nothing here asks you to throw away what you've already built — the template, the AI-generation flow, the Web Component/R2 bundle model are all sound and stay exactly as they are. What changes is the process wrapped around them: build, preview, and "go live" become three separate, automatable steps instead of one manual command tied to your laptop, while the business checkpoints you actually care about — founder approval, payment before production — stay exactly where they are.
