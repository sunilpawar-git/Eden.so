# AGENTS.md — AI Agent Operational Reference

> Quick-reference guide for AI coding agents (Claude, Copilot, etc.) working on this repo.
> **Read CLAUDE.md + MEMORY.md for the full rule set. This file is the distilled checklist.**

## 🚨 NON-OBVIOUS PROJECT-SPECIFIC RULES

### Critical Gotchas (Would Cause Silent Failures)
- **Tailwind spacing**: `src/styles/global.css` reset zeros Tailwind spacing utilities → **use inline `style` props for margin/padding/gap**, not Tailwind classes
- **overflow-hidden bug**: Fixed-height containers **must use `overflow-clip`** (not `overflow-hidden`) to prevent focus-scroll bugs
- **ID generation**: **Always** `const id = \`idea-${crypto.randomUUID()}\`` — `Date.now()` causes collision risks
- **Zustand selectors**: **Never** destructure stores → `const userId = useAuthStore(s => s.user?.id)` (primitive selector)
- **useCallback stability**: Wrap reactive values in `useRef` to keep callback deps `[]` stable
- **Firestore writes**: >500 ops → `chunkedBatchWrite()`, ≤500 → `runTransaction()` (raw `writeBatch` fails at 501+ ops)
- **getDocs limit()**: **All** Firestore queries **must** use `.limit()` — structural test enforces this
- **Base64 in Firestore**: **Never** store base64 images — `stripBase64Images()` called automatically before writes
- **Console logging**: **Never** `console.*` — use `logger.error/warn/info` only (structural test blocks bare console calls)
- **Env var changes**: Adding to `REQUIRED_VARS` **requires** updating `src/__tests__/envValidation.structural.test.ts` in same commit

### Security Layer Order (HTTP Cloud Functions)
```
Bot Detection → IP Rate Limit → Auth → User Rate Limit
→ Body Size Cap → [domain logic] → Prompt Filter → Output Scan → Security Log
```
- **Bot detection first**: `detectBot(req)` runs before auth (zero Firestore cost for bots)
- **IP rate limit separate**: Keyed on client IP (not UID) — stops distributed attacks
- **AI endpoints**: After auth/user rate limit, run `filterPromptInput(body)` + `filterPromptOutput(response)`
- **Captcha gate**: Login/upload endpoints **must** verify Turnstile/reCAPTCHA token first

### Testing & CI
- **Single test**: `npx vitest run src/path/to/file.test.ts` or `npx vitest run -t "test name"`
- **Check pipeline**: `npm run check` (typecheck + lint + test) — **must be green** before commit
- **Structural tests fail build**: Fix root cause — never update test to match bad code
  - `noConsoleLog.structural.test.ts`: No bare `console.*` outside logger
  - `firestoreQueryCap.structural.test.ts`: All `getDocs` use `limit()`
  - `zustandSelectors.structural.test.ts`: No bare store destructuring
  - `geminiKeyIsolation.structural.test.ts`: Only `geminiClient.ts` references `VITE_GEMINI_API_KEY`
  - `envValidation.structural.test.ts`: `REQUIRED_VARS` mirrors `src/config/envValidation.ts`
  - `cspCompleteness.structural.test.ts`: CSP in `firebase.json` headers (not meta tag)

### File & Size Limits (Zero Tolerance)
- **File**: ≤ 300 lines
- **Component**: ≤ 100 lines  
- **Function**: ≤ 50 lines
- **Hook**: ≤ 75 lines
**Split immediately** — no exceptions, no "TODO: split later"

### What Never to Do
- ❌ Hardcode secrets/API keys (Gitleaks blocks build)
- ❌ Add `VITE_GEMINI_API_KEY` to deploy.yml (must go through Cloud Functions proxy)
- ❌ Re-add `<meta http-equiv="Content-Security-Policy">` (CSP lives in firebase.json headers only)
- ❌ Use `Date.now()` for entity IDs (collision risk — use `crypto.randomUUID()`)
- ❌ Import entire Zustand store (`const { user } = useStore()`) — causes cascading re-renders
- ❌ Call `console.*` directly — use `logger.*` (structural test blocks bare console calls)
- ❌ Skip `logSecurityEvent()` on 4xx/5xx — all security events must be observable in Cloud Logging
- ❌ Create raw `writeBatch` with > 500 ops — Firestore rejects (use `chunkedBatchWrite()`)

### Key Conventions
- **Imports**: `@/` aliases, order: React → external → `@/` imports → relative
- **Types**: `interface` for object shapes, `readonly T[]` for immutable arrays, `as const` for literals
- **Naming**: kebab-case/files, camelCase/hooks/vars, PascalCase/components/interfaces, SCREAMING_SNAKE_CASE/constants
- **Error handling**: try/catch with specific types, `logger.error()` with context, return typed results (never throw for expected errors)
- **Commit**: `feat(scope): description`, `fix(scope): description`, `security(scope): description`, etc.
