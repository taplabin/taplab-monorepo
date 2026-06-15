# TapLab — New Client Onboarding Sequence

> Follow this sequence exactly. Do not skip or reorder steps.

---

## Step 1 — Data Acquisition

Before touching any code, collect the following from the client:

- **Recurring price** — Agree on a subscription price and note it down.
- **Billing cycle** — Confirm whether they want monthly or yearly billing. *(Required for cloud/maintenance setup.)*
- **Visual assets** — Photograph their menu or collect 2–3 reference images/illustrations (PNGs or JPGs) from Pinterest or similar. *(Required for development.)*
- **Email address** — Their primary email. *(Required for CMS login.)*
- **Broker Information** - Is there a broker or not ? Have we registered this broker on our system ? What is thier commission on this client ?

---

## Step 2 — Scaffold the Project

From the **root of the monorepo**, run:

```bash
# General formula
node scripts/new-page.js slug_name "Business Name"

# Example
node scripts/new-page.js thegluck "THE GLÜCK"
```

This creates a new project for the business. Every client gets their own project.

> **Note:** These projects are gitignored and will not be pushed to the monorepo — that's intentional, to keep the repo lightweight. The project lives on your local machine only.

---

## Step 3 — Install Dependencies

```bash
cd pages/slug_name

npm install
```

This step is mandatory. Do not skip it.

---

## Step 4 — Generate the Initial Design with Claude

1. Open Claude in your browser.
2. Upload the images collected in Step 1 and attach the `TAPLAB_PROMPT.md` file from the project root. Hit send.
3. Claude will ask you 5 questions, answer them accordingly.
4. Claude will return `App.tsx` and `content.ts`.
5. Paste both files into the `src` folder of the scaffolded project.

---

## Step 5 — Development & Client Review

- Gather any specific requirements from the client.
- Make style adjustments inside the `<style>` tag of `App.tsx` until the design matches expectations.

To preview locally:

```bash
cd pages/slug_name

npm run dev
```

> **Important:** Show the client the local preview and get their explicit approval before proceeding. This avoids rework down the line.

---

## Step 6 — Build the Project

Once the client has approved the design:

```bash
cd pages/slug_name

npm run build
```

> **Warning:** Do not run this inside the template project. The build generates `App.js` and `content.js` in `src`, and `deploy.js` in `scripts` — running it in the template will pollute every future project scaffolded from it.

After building, do a final local check:

```bash
npm run dev
```

Confirm the output matches the approved design. If it does, you're good to go.

---

## Step 7 — Register the Business in Admin

1. Go to [admin.taplab.in](https://admin.taplab.in).
2. Click **Add New Business** and fill in:
   - Slug name and business name
   - Client email (from Step 1)
   - Agreed price and billing cycle (from Step 1)
3. Hit **Create**. This provisions their Firestore document, which is required before deployment.

You'll receive two links:
1. **Razorpay subscription link** — send this to the client for payment setup.
2. **CMS portal login** — where the client can edit their page content.

Send both links to the client via WhatsApp or email.

---

## Step 8 — Deploy

```bash
cd pages/slug_name

# General formula
npm run deploy --slug=slug_name

# Example
npm run deploy --slug=thegluck
```

> **Critical:** Do Steps 7 and 8 back-to-back without delay. The Firestore document created in Step 7 must exist before deployment runs.