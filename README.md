# Eden.so (ActionStation)

AI-powered infinite whiteboard for creating, connecting, and synthesising ideas.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, ReactFlow (canvas), TipTap (rich text) |
| State | Zustand (client), TanStack Query (server) |
| Backend | Firebase Auth, Firestore, Cloud Functions, Storage |
| AI | Gemini via Cloud Function proxy |
| Build | Vite, TypeScript strict, Vitest |
| Observability | Sentry (errors), PostHog (analytics), web-vitals |

## Prerequisites

- Node.js ≥ 20
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Auth (Google provider), Firestore, Storage, and Functions enabled

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create local env file (never commit this)
cp .env.example .env.local
# Fill in all VITE_* variables (see below)

# 3. Start dev server
npm run dev
```

## Environment Variables

Create `.env.local` at the project root:

```env
# Firebase (client-safe — restricted by domain in Firebase Console)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Gemini AI (server-side only — set in Cloud Functions config)
# NEVER put this in .env.local
# GEMINI_API_KEY=

# Observability (optional — app works without these)
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com

# Environment label (defaults to Vite mode: development/production)
VITE_APP_ENV=development
```

## Scripts

```bash
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Type-check + lint + test + build
npm run build:quick  # Build without checks (CI uses full build)
npm run test         # Run all tests (Vitest)
npm run test:watch   # Watch mode
npm run test:coverage
npm run lint         # ESLint (max 49 warnings)
npm run lint:strict  # ESLint (zero warnings — enforced pre-merge)
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + lint + test (run before committing)
```

## Cloud Functions

```bash
cd functions
npm install
npm run build
firebase emulators:start --only functions  # Local emulator on :5001
firebase deploy --only functions           # Deploy
```

## Architecture

```
src/
├── features/          # Feature modules (MVVM, one domain per folder)
│   ├── auth/          # Firebase Auth + Google OAuth
│   ├── canvas/        # ReactFlow canvas, nodes, edges
│   ├── ai/            # Gemini generation + transformation
│   ├── workspace/     # Multi-workspace management + offline sync
│   ├── knowledgeBank/ # File/text KB with AI summarisation
│   ├── subscription/  # Feature gates (free/pro)
│   ├── search/        # Full-text node search
│   └── tags/          # Node tagging
├── shared/
│   ├── components/    # Reusable UI (Button, Toast, ErrorBoundary)
│   ├── hooks/         # Generic hooks (useDebounce, useEscapeLayer)
│   ├── services/      # Cross-cutting services (Sentry, PostHog, web-vitals)
│   ├── stores/        # Shared Zustand stores (toast, confirm, settings)
│   ├── utils/         # Pure functions
│   ├── localization/  # All user-facing strings (no inline strings)
│   └── validation/    # Zod schemas for all Firestore-bound inputs
├── app/               # App shell (Layout, routing context, hooks)
├── config/            # Firebase init, query client, constants
└── styles/            # CSS variables, global styles
```

### Key Architectural Decisions

**Zustand selector pattern is mandatory.** Bare destructuring from stores causes cascading re-renders with 500+ ReactFlow nodes. Always use:
```typescript
const user = useAuthStore((s) => s.user);               // ✅ selector
const { user } = useAuthStore();                        // ❌ forbidden
```
A structural test (`src/__tests__/zustandSelectors.structural.test.ts`) fails the build if anti-patterns are detected.

**No hardcoded strings or colours.** All strings go in `src/shared/localization/strings.ts`. Colours use CSS variables from `src/styles/variables.css`.

**Gemini API key never reaches the client.** All AI calls go through `functions/src/geminiProxy.ts`.

## Testing

Tests are co-located with source files in `__tests__/` directories. Coverage targets: Stores 90%, Services 85%, Utils 100%, Hooks 80%, Components 60%.

```bash
npm run test                    # All tests
npm run test:coverage           # With coverage report
```

## Deployment

**Preview (per-PR):** GitHub Actions deploys a Firebase Hosting preview channel on every pull request. The PR gets a comment with the preview URL.

**Production:** Merge to `main` triggers a full build + test + Firebase deploy.

Required GitHub Secrets:
- `FIREBASE_SERVICE_ACCOUNT` — service account JSON for Firebase deployment
- `VITE_FIREBASE_*` — all Firebase client config vars
- `VITE_SENTRY_DSN` — Sentry DSN
- `VITE_POSTHOG_KEY` — PostHog project key

## Security

- Firestore rules enforce per-user data isolation (deny-all by default)
- Gemini API key hidden in Cloud Functions environment (never client-side)
- CSP header in `index.html` restricts script/connect sources
- OAuth token format validated before use
- Input validation via Zod on all Firestore-bound forms
- Secrets in `.env.local` only — never committed (enforced by `.gitignore`)
