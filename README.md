# TapLab Platform

A monorepo for managing business pages with Web Components, Razorpay subscriptions, and Firebase.

## Structure

- `host/` - Visitor-facing shell site (React, Vite)
- `admin/` - Admin dashboard (React, Vite)
- `backend/` - API service (Node.js, Fastify)
- `pages/template/` - Starter template for business pages
- `pages/pizza-palace/` - Example business page

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project
- Razorpay account (optional for dev)

### Setup

1. Copy `.env.example` to `.env` in backend folder
2. Add Firebase service account credentials
3. Add Razorpay keys (optional for local dev)

### Running Services

```bash
# Backend
cd backend && npm install && npm run dev

# Host Site
cd host && npm install && npm run dev

# Admin Dashboard
cd admin && npm install && npm run dev
```

### Creating a New Business Page

```bash
# Copy template
cp -r pages/template pages/your-business

# Update TAG_NAME in src/main.tsx
# Build your UI in src/App.tsx

# Deploy (local mode)
cd pages/your-business
npm run deploy --slug=your_business

# Serve the built file
npx vite preview --port 5174
```

## Implementation Status

- ✅ Phase 0: Project scaffold
- ✅ Phase 1: Backend API with Firestore
- ✅ Phase 2: Razorpay integration (dev mode)
- ✅ Phase 3: Host site with dynamic Web Component loading
- ✅ Phase 4: Page template + deploy script
- ✅ Phase 5: Admin dashboard
- ⏳ Phase 6: CDN + Production deployment
- ⏳ Phase 7: End-to-end testing

## Documentation

See the `00-claude-code-implementation-plan.md` for detailed implementation phases.
