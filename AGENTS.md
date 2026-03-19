# AGENTS.md — AI Agent Operational Reference

> Quick-reference guide for AI coding agents (Claude, Copilot, etc.) working on this repo.
> **Read CLAUDE.md + MEMORY.md for the full rule set. This file is the distilled checklist.**

---

## Project at a Glance

| Property | Value |
|---|---|
| **GCP Project** | `actionstation-244f0` |
| **Firebase Hosting** | `actionstation-244f0.web.app` / `actionstation-244f0.firebaseapp.com` |
| **Cloud Functions region** | `us-central1` |
| **Backup bucket** | `gs://actionstation-244f0-firestore-backups-immutable` |
| **Tech stack** | React 18 + TypeScript + Vite + Firebase + Zustand + ReactFlow |
| **Test runner** | Vitest (`npm run test` / `npm run check`) |
| **Functions runtime** | Node 22 (ESM), Firebase Functions v2 |

---

## Before You Touch Anything

```bash
npm run check        # types + lint + tests — must stay green
```

CI runs the same pipeline on every push. A red CI blocks merge.

---

## Running Commands

### Frontend (src/)

```bash
npm run dev                 # Start dev server
npm run build               # Full check + production build
npm run build:quick         # Skip lint/test, just build
npm run typecheck           # TypeScript only
npm run lint                # ESLint
npm run lint:fix            # Auto-fix ESLint issues
npm run test                # Run all tests once
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run check               # typecheck + lint + test (full CI pipeline)
```

### Running a Single Test

```bash
# By file path
npx vitest run src/shared/stores/__tests__/settingsStore.test.ts

# By pattern (matching filename)
npx vitest run settingsStore

# By test name
npx vitest run -t "test name here"

# Watch mode for single file
npx vitest src/shared/stores/__tests__/settingsStore.test.ts
```

### Cloud Functions (functions/)

```bash
cd functions
npm run check              # lint + test + build
npm run lint               # ESLint only
npm run test               # Run tests
npm run build              # Compile TypeScript
```

---

## Hard Limits (Zero Tolerance)

| Rule | Limit |
|---|---|
| File size | ≤ 300 lines |
| Component | ≤ 100 lines |
| Function | ≤ 50 lines |
| Hook | ≤ 75 lines |

Split immediately — no exceptions, no "TODO: split later".

---

## Code Style Guidelines

### Imports

Use `@/` path aliases. Group imports in this order:

1. React/framework imports
2. External libraries
3. Internal `@/` imports
4. Relative imports (local files)

```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { logger } from '@/shared/services/logger';
import { MyComponent } from './MyComponent';
```

Use `type` imports for types only:
```typescript
import { type User, type Settings } from '@/shared/types';
```

### Types

- Use `interface` for object shapes, not `type` (enforced by ESLint)
- Use `readonly` for immutable arrays: `readonly T[]`
- Avoid `any` — always type explicitly
- Use `as const` for literal values that won't change
- Prefer `null` over `undefined` for optional values

### Naming

- **Files**: kebab-case (`my-component.tsx`) or camelCase (`settingsStore.ts`)
- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase starting with `use` (`useDebounce.ts`)
- **Constants**: SCREAMING_SNAKE_CASE for config constants
- **Interfaces/Types**: PascalCase (`UserSettings`)
- **Booleans**: Prefix with `is`, `has`, `should`, `can` (`isLoading`, `hasError`)

### Error Handling

- Use try/catch with specific error types
- Always log errors via `logger.error()` with context
- Return typed results, not throw for expected errors
- Never swallow errors silently

```typescript
// ✅ Good - typed result with error handling
async function fetchUser(id: string): Promise<{ user: User | null; error: Error | null }> {
  try {
    const user = await db.collection('users').doc(id).get();
    return { user: user.data() ?? null, error: null };
  } catch (err) {
    logger.error('Failed to fetch user', err, { userId: id });
    return { user: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ❌ Bad - bare console.error
catch (err) { console.error(err); }
```

### React Patterns

- Use functional components with hooks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passed to children
- Use primitive selectors for Zustand stores:

```typescript
// ✅ Good
const userId = useAuthStore((s) => s.user?.id);

// ❌ Bad - causes re-renders
const { user } = useAuthStore();
```

### Formatting

- Use 4-space indentation (TypeScript standard)
- Trailing commas in multi-line objects/arrays
- Single quotes for strings (except JSX attributes)
- Prefer early returns over nested conditionals

---

## Adding a New Cloud Function (Checklist)

1. Create `functions/src/myFunction.ts`
2. Export from `functions/src/index.ts`
3. Apply the security layer order (see below)
4. Add any new secret via `defineSecret('MY_SECRET')` + `secrets: [mySecret]` in `onRequest()`
5. Store the secret in Secret Manager — never hardcode
6. Write tests in `functions/src/__tests__/myFunction.test.ts`
7. Run `cd functions && npm run check` — must be green
8. Deploy: `firebase deploy --only functions:myFunction`

### Security layer order for every HTTP Cloud Function

```
Bot Detection → IP Rate Limit → Auth → User Rate Limit
→ Body Size Cap → [domain logic] → Security Log
```

```typescript
// 1. Bot detection (cheapest — no Firestore hit)
const bot = detectBot(req);
if (bot.isBot && bot.confidence !== 'low') { /* 403 + log */ }

// 2. IP rate limit (stops multi-account distributed abuse)
const ip = extractClientIp(req);
if (!await checkIpRateLimit(ip, 'myEndpoint', IP_RATE_LIMIT)) { /* 429 + log */ }

// 3. Auth (Firebase ID token)
const uid = await verifyAuthToken(req.headers.authorization);
if (!uid) { /* 401 + log */ }

// 4. User rate limit (per-UID Firestore-backed sliding window)
if (!await checkRateLimit(uid, 'myEndpoint', MY_RATE_LIMIT)) { /* 429 + log */ }

// 5. Body size cap
// 6. Domain logic
// 7. logSecurityEvent() on every 4xx/5xx
```

### AI endpoint additions (Gemini / any LLM)

After step 4, also run:
- `filterPromptInput(body)` — blocks 14 injection + 5 exfiltration patterns
- `filterPromptOutput(response)` — scans for leaked GCP API keys / Bearer tokens / private keys

---

## Captcha Gate (Login / Upload)

Any endpoint exposed to unauthenticated users that triggers login or upload **must** be protected:

```typescript
// Client: complete Turnstile widget → POST token here first
POST /verifyTurnstile { token: string }
// 200 → proceed | 403 → block
```

For reCAPTCHA v3: use `verifyRecaptchaToken(token, secret, action, ip)` from
`functions/src/utils/captchaValidator.ts`. Always pass the `action` string.

---

## Firestore Rules

- All reads/writes require `request.auth != null && request.auth.uid == userId`
- Node and edge documents must carry `userId` + `workspaceId` fields
- All `getDocs` calls must use `limit()` — structural test enforces this
- Writes ≤ 500 ops → `runTransaction()`; writes > 500 ops → `chunkedBatchWrite()`

---

## React / Zustand Rules

```typescript
// ✅ Primitive selector — effect only re-runs when ID changes
const userId = useAuthStore((s) => s.user?.id);
useEffect(() => { ... }, [userId]);

// ✅ useRef mirror — keeps useCallback stable
const userRef = useRef(user);
userRef.current = user;
const handleAction = useCallback(() => { const u = userRef.current; ... }, []);

// ✅ Actions via getState() — no re-render dependency
useAuthStore.getState().setUser(newUser);
```

Never use bare store destructuring (`const { user } = useAuthStore()`).

---

## Security Event Logging (Required on Every 4xx/5xx)

```typescript
import { logSecurityEvent, SecurityEventType } from './utils/securityLogger.js';
import { recordThreatEvent } from './utils/threatMonitor.js';

logSecurityEvent({
  type: SecurityEventType.AUTH_FAILURE,  // or RATE_LIMIT_VIOLATION, BOT_DETECTED, CAPTCHA_FAILED, …
  uid,
  ip,
  endpoint: 'myFunction',
  message: 'Human-readable description',
});
recordThreatEvent('auth_failure_spike', { uid, endpoint: 'myFunction' });
```

Cloud Monitoring alert fires on any log with `labels.eden_security="true" AND severity>=ERROR`.

---

## ID Generation

```typescript
// ✅ Always
const id = `idea-${crypto.randomUUID()}`;

// ❌ Never
const id = `idea-${Date.now()}`; // collision risk <1ms
```

---

## Logging

```typescript
// ✅ Structured logger only
import { logger } from '@/shared/services/logger';
logger.error('msg', err, { ctx: value }); // Sentry + console
logger.warn('msg');
logger.info('msg'); // gated in production

// ❌ Never
console.log / console.error / console.warn
```

Fire-and-forget async must have `.catch((err) => logger.warn('[ctx]', err))`.

---

## Commit Convention

```
feat(scope): description    # new feature
fix(scope): description     # bug fix
security(scope): description # security fix
test(scope): description    # tests
docs(scope): description    # docs only
refactor(scope): description
```

---

## What Never to Do

| Action | Why |
|---|---|
| Hardcode secrets / API keys | CI secret-scan (Gitleaks) blocks the build |
| Add `VITE_GEMINI_API_KEY` to `deploy.yml` | Gemini must go through Cloud Functions proxy in prod |
| Re-add `<meta http-equiv="Content-Security-Policy">` | CSP lives in `firebase.json` headers only |
| Create raw `writeBatch` with > 500 ops | Firestore rejects — use `chunkedBatchWrite()` |
| Use `Date.now()` for entity IDs | Collision risk; use `crypto.randomUUID()` |
| Import entire Zustand store (`const { user } = useStore()`) | Causes cascading re-renders in ReactFlow |
| Call `console.*` directly | Use `logger.*`; structural test blocks bare console calls |
| Skip `logSecurityEvent()` on 4xx/5xx | All security events must be observable in Cloud Logging |
| Add new required env var without updating `envValidation.structural.test.ts` | Test mirrors `REQUIRED_VARS` — both must change together |

---

## Key File Locations

| What | Where |
|---|---|
| Security layer utilities | `functions/src/utils/{botDetector,ipRateLimiter,rateLimiter,promptFilter,fileUploadValidator,captchaValidator,securityLogger,threatMonitor}.ts` |
| Security constants (limits, messages) | `functions/src/utils/securityConstants.ts` |
| CORS allowed origins | `functions/src/utils/corsConfig.ts` |
| Env validation (REQUIRED_VARS) | `src/config/envValidation.ts` + `src/__tests__/envValidation.structural.test.ts` |
| Firestore query caps | `src/config/firestoreQueryConfig.ts` |
| Cloud Armor setup | `scripts/setup-cloud-armor.sh` |
| Immutable backup setup | `scripts/setup-immutable-backups.sh` |
| Schema migrations | `src/migrations/migrationRunner.ts` |
| Web Worker client | `src/workers/knowledgeWorkerClient.ts` |
| Content sanitizer | `src/shared/utils/contentSanitizer.ts` |

---

## Structural Tests That Guard Invariants

| Test | Guards |
|---|---|
| `cspCompleteness.structural.test.ts` | CSP in `firebase.json` headers (not meta tag) |
| `envValidation.structural.test.ts` | `REQUIRED_VARS` list mirrors `envValidation.ts` |
| `noHardcodedSecrets.structural.test.ts` | No `AIza…` / `sk-…` patterns in source |
| `geminiKeyIsolation.structural.test.ts` | Only `geminiClient.ts` may reference `VITE_GEMINI_API_KEY` |
| `noConsoleLog.structural.test.ts` | No bare `console.*` outside `logger.ts` |
| `firestoreQueryCap.structural.test.ts` | All `getDocs` calls use `limit()` |
| `zustandSelectors.structural.test.ts` | No bare store destructuring (8 anti-patterns) |

Structural tests fail the build — fix the root cause, never update the test to match bad code.
