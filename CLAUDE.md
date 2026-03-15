# ActionStation - Project Rules

> **CRITICAL**: ZERO TECH DEBT policy. All rules are NON-NEGOTIABLE.

## 🚨 STRICT LIMITS

| Rule | Limit | Action |
|------|-------|--------|
| File Size | MAX 300 lines | Split immediately |
| Component | MAX 100 lines | Extract sub-components |
| Function | MAX 50 lines | Extract helpers |
| Hook | MAX 75 lines | Split by responsibility |

## 🏗️ ARCHITECTURE (MVVM + Feature-First)

```
src/
├── features/              # Feature modules (SSOT per domain)
│   ├── auth/
│   │   ├── types/         # Model: interfaces
│   │   ├── stores/        # ViewModel: Zustand slices
│   │   ├── hooks/         # Bridge: useAuth, useUser
│   │   ├── components/    # View: LoginButton, UserAvatar
│   │   ├── services/      # Side effects: authService
│   │   └── __tests__/     # Co-located tests
│   ├── canvas/            # Nodes, edges, ReactFlow integration
│   ├── ai/                # Gemini generation, transformation
│   ├── workspace/         # Workspace CRUD, loader, sync
│   ├── knowledgeBank/     # KB entries, TF-IDF scoring
│   ├── clustering/        # Similarity + cluster suggestions
│   ├── search/            # Full-text search (debounced)
│   ├── calendar/          # Google Calendar sync
│   └── documentAgent/     # Image analysis, auto-spawn
├── shared/
│   ├── components/        # Reusable UI (Button, Toast)
│   ├── hooks/             # Generic hooks (useDebouncedCallback)
│   ├── services/          # logger.ts, Sentry, analytics
│   ├── utils/             # Pure functions (firebaseUtils, contentSanitizer)
│   └── localization/      # String resources
├── migrations/            # Firestore schema migrations (migrationRunner.ts)
├── workers/               # Web Workers (knowledgeWorker.ts — TF-IDF off-thread)
├── config/                # Environment, firestoreQueryConfig, constants
└── styles/                # CSS variables, global styles
```

### Firestore Data Model

```
users/{userId}/
  workspaces/{workspaceId}   # + schemaVersion, userId
    nodes/{nodeId}           # + schemaVersion, userId, workspaceId
    edges/{edgeId}           # + userId, workspaceId
  knowledgeBank/{entryId}
```

Every node and edge document stores `userId` + `workspaceId`. Firestore rules validate both the path-level auth **and** `resource.data.userId == request.auth.uid`.

### SOLID Principles Enforcement
- **S**: One file = One responsibility
- **O**: Extend via composition, not modification
- **NO HARDCODED STRINGS**: Use `stringResource(R.string.key)` or `context.getString()`.
- **NO HARDCODED COLORS**: Use `MaterialTheme.colorScheme.primary`.
- **NO HARDCODED DIMENSIONS**: Use `dp` or `sp` resources/constants.
- **SECURITY: NO SECRETS IN CODE**: NEVER hardcode API keys, passwords, or tokens. Use `.env.local` for local development. Use environment variables in CI/CD.
- **L**: Interfaces define contracts
- **I**: Small, focused interfaces
- **D**: Depend on abstractions (services via interfaces)

## 🗣️ NO HARDCODING (ZERO TOLERANCE)

```typescript
// ❌ FORBIDDEN
<button>Submit</button>
style={{ color: '#3b82f6' }}

// ✅ REQUIRED
import { strings } from '@/shared/localization/strings';
<button>{strings.common.submit}</button>
className={styles.primaryButton}  // Uses CSS variable
```

## � CSS → TAILWIND INCREMENTAL MIGRATION

> **Strategy**: Migrate one component at a time — only when you already touch its `.tsx` file during normal production work. Never migrate speculatively.

### The Golden Rule

> When you modify a component's `.tsx` file, migrate its **entire** `.module.css` to Tailwind in the **same PR**. Never leave a component half-migrated.

### What Tailwind replaces

- `.module.css` files for **UI components** → replaced with `className="..."` Tailwind utilities
- Hardcoded `style={{}}` props → replaced with Tailwind utilities

### What NEVER gets migrated

| File / Pattern | Reason |
|---|---|
| `src/styles/variables.css` | This IS the design system — Tailwind reads from it |
| `src/styles/themes/*.css` | Runtime theme switching relies on `:root` CSS variable overrides |
| `src/styles/global.css` | Resets and global rules must stay in CSS |
| `src/styles/semanticZoom.css` | Canvas viewport rules — pixel-precision required |
| Canvas layout: `position: absolute`, transforms, React Flow overrides | Tailwind utilities are insufficient here |
| Custom scrollbar styles (`::-webkit-scrollbar`) | Must remain in CSS |

### Migration Priority (easiest → hardest — only when touched)

| Tier | Components |
|---|---|
| ✅ Easy | `OfflineBanner`, `SyncStatusIndicator`, `CalendarBadge`, `PoolPreviewBadge`, `PinWorkspaceButton` |
| 🟡 Medium | `LoginPage`, `SearchBar`, `TagInput`, `WorkspaceItem`, `SettingsPanel/*` |
| 🔴 Hard — migrate last | `IdeaCard`, `CanvasView`, `TipTapEditor`, `ClusterBoundaries`, `ZoomControls` |
| 🚫 Never | Everything in `src/styles/` global/variables/themes |

### Tailwind class rules

```tsx
// ❌ FORBIDDEN — mixing Module CSS and Tailwind in same component
import styles from './Button.module.css';
<button className={`${styles.btn} mt-4`}>...</button>

// ❌ FORBIDDEN — Tailwind spacing utilities are zeroed by global * reset
<button className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">...</button>

// ✅ CORRECT — layout + color via Tailwind, spacing via style prop
<button
    className="flex items-center bg-[var(--color-primary)] text-white rounded-lg"
    style={{ marginTop: 16, padding: '8px 16px' }}
>...</button>

// ✅ CORRECT — CSS variable values in Tailwind arbitrary syntax (for non-spacing properties)
className="text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-[var(--radius-md)]"

// ✅ CORRECT — spacing token → style prop (NOT Tailwind class)
// --space-sm: 8px  → style={{ padding: 8 }}   or style={{ gap: 8 }}
// --space-md: 16px → style={{ padding: 16 }}  or style={{ margin: 16 }}
// --space-lg: 24px → style={{ padding: 24 }}
```

### 🔴 CRITICAL: Global CSS Reset Kills Tailwind Spacing Utilities

**Root cause discovered during LoginPage migration (Wave 4).**

`src/styles/global.css` contains a bare `*` reset declared **after** `@import "tailwindcss"`:

```css
@import "tailwindcss";   /* ← Tailwind utilities go into @layer utilities */

*, *::before, *::after {
    margin: 0;
    padding: 0;   /* ← bare rule, outside any layer — wins the cascade */
}
```

In Tailwind v4, utilities live in `@layer utilities`. CSS rules declared **outside any layer** always win over layered rules regardless of source order. This means **every Tailwind spacing utility is zeroed out** by the global reset:

```tsx
// ❌ These classes produce ZERO spacing — reset wins the cascade
<div className="py-12 px-10 mb-8 mt-4 gap-3">

// ✅ Use inline style props for ALL spacing — reset cannot override inline styles
<div style={{ padding: '48px 40px', marginBottom: 32, gap: 12 }}>
```

**Rule: During any Tailwind migration, use `style` props for all `margin`, `padding`, and `gap` values. Use Tailwind `className` only for layout (`flex`, `items-center`), colors, borders, border-radius, shadows, and font weights — properties the reset does not touch.**

```tsx
// ✅ CORRECT pattern for this codebase
<div
    className="flex flex-col items-center rounded-[var(--radius-xl)]"
    style={{ padding: '56px 48px', marginBottom: 32 }}
>
```

**Do NOT attempt to fix this by reordering `global.css`** — the `*` reset must stay to normalize browser defaults for the canvas.

---

### Hard rules during migration

1. **All-in or leave it**: Never partially convert a `.module.css` — convert the whole file or none
2. **Delete the `.module.css` file** when done — do not leave empty or orphaned files
3. **No new `.module.css` files** may be created for any component going forward
4. **Theme-aware colors** must use `var(--color-*)` arbitrary syntax, never Tailwind's built-in palette (e.g. `bg-blue-500` → `bg-[var(--color-primary)]`)
5. **Canvas components stay in CSS** — `IdeaCard`, `CanvasView`, node/edge files are last-resort migrations
6. **Spacing via `style` props** — `margin`, `padding`, `gap` must use inline `style` props, not Tailwind spacing utilities (see "Global CSS Reset" section above)

---

## �🆔 ID GENERATION CONVENTION

```typescript
// ✅ ALWAYS use crypto.randomUUID() for node/edge IDs
const id = `idea-${crypto.randomUUID()}`;
const edgeId = `edge-${crypto.randomUUID()}`;

// ❌ NEVER use Date.now() — collision risk under rapid creation
// const id = `idea-${Date.now()}`; // TWO nodes in <1ms = same ID
```

## ⚡ PERFORMANCE RULES (ReactFlow 500+ Nodes)

```typescript
// 1. ALWAYS memoize custom nodes
const PromptNode = React.memo(({ data }: NodeProps) => { ... });

// 2. NEVER access nodes/edges directly in render
// ❌ const nodes = useStore(state => state.nodes);
// ✅ const nodeCount = useStore(state => state.nodes.length);

// 3. Decouple selection state
const selectedNodeIds = useStore(state => state.selectedNodeIds);

// 4. Use viewport-only rendering (lazy render)
<ReactFlow onlyRenderVisibleElements={true} />

// 5. Memoize callbacks — use useRef for reactive values, keep deps stable
const userRef = useRef(user);
userRef.current = user;
const handleAction = useCallback(async () => {
    const u = userRef.current; // always fresh, no stale closure
}, []); // ✅ stable reference
```

### Heavy computation off the main thread

TF-IDF scoring and similarity clustering must **never** block the UI thread. Use the Web Worker client:

```typescript
import { computeClustersAsync, rankEntriesAsync } from '@/workers/knowledgeWorkerClient';

// Runs in Web Worker; falls back to main thread if Workers unavailable
const result = await computeClustersAsync(nodes, { minClusterSize: 3 });
```

### Search input debouncing

All search inputs must debounce before triggering computation. Use the shared hook:

```typescript
import { useDebouncedCallback } from '@/shared/hooks/useDebounce';
const debouncedSearch = useDebouncedCallback(search, 250);
```

## 🗺️ SPATIAL CHUNKING (Tile-Based Graph Storage)

The canvas uses spatial chunking to reduce Firestore reads by ~80-95% at scale.

### Architecture

```
users/{userId}/workspaces/{workspaceId}/
├── tiles/{tileId}/nodes/{nodeId}   ← spatially-partitioned nodes
├── edges/{edgeId}                  ← edges stay flat (fewer docs)
└── (workspace doc has spatialChunkingEnabled: boolean)
```

**Tile size**: `TILE_SIZE = 2000` px (configured in `firestoreQueryConfig.ts`)
**Tile ID format**: `tile_{xIndex}_{yIndex}` — e.g. `tile_3_4` for position `(7500, 9200)`

### Key Modules

| Module | Purpose |
|--------|---------|
| `tileCalculator.ts` | Pure math: position → tile coords/ID, viewport → tile set |
| `tileLoader.ts` | Firestore reads from tile subcollections + in-memory cache |
| `tiledNodeWriter.ts` | Firestore writes grouped by tile, with orphan cleanup |
| `tileReducer.ts` | Pure `useReducer` state machine for tile lifecycle |
| `useViewportTileLoader.ts` | React hook: viewport changes → tile loads (debounced) |
| `useTiledSaveCallback.ts` | Dirty-tile tracking + tiled save function |
| `spatialChunkingMigration.ts` | One-time paginated migration from flat `nodes/` to `tiles/` |

### Rules

1. **Feature flag**: Gated by `workspace.spatialChunkingEnabled` — backwards compatible
2. **Tile eviction**: Stale tiles evicted after `TILE_EVICTION_MS` (60s) via periodic interval
3. **Dirty tracking**: Done in `useEffect` (never during render) via `prevNodesRef` comparison
4. **Zustand compliance**: `useViewportTileLoader` uses `useReducer` (isolated from canvas store), scalar selectors, `getState()` for actions, `useRef` for stale-closure prevention
5. **Migration**: `migrateFlatToTiled()` is paginated (handles >1000 nodes), idempotent, normalizes `colorKey`/`contentMode`
6. **Firestore rules**: `tiles/{tileId}/nodes/{nodeId}` mirrors `nodes/{nodeId}` auth rules

### Adding New Tile Features

- New tile-related constants go in `firestoreQueryConfig.ts`
- New string resources go in `workspaceStrings.ts` (prefixed with `tile`)
- Tile state transitions go through `tileReducer` actions — never mutate directly

## 🔒 SECURITY PROTOCOL

### Firebase Rules Structure
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DENY ALL by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // User isolation
    match /users/{userId} {
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
      
      match /workspaces/{workspaceId} {
        allow read, write: if request.auth.uid == userId;
        
        match /nodes/{nodeId} {
          allow read, write: if request.auth.uid == userId;
        }
        match /edges/{edgeId} {
          allow read, write: if request.auth.uid == userId;
        }
      }
    }
  }
}
```

### API Key Protection
- `.env.local` for all secrets (NEVER commit)
- Firebase App Check enabled (recaptcha v3)
- Gemini API calls via Cloud Function (hide API key)

### Code Security
- NO `any` types in production
- Input validation on all user content
- XSS prevention: sanitize markdown output
- CORS configured for production domain only
- Base64 stripped before every Firestore write — `stripBase64Images()` in `contentSanitizer.ts`
- `data:` URIs removed from CSP `img-src` directive
- Secret scanning enforced via Gitleaks in CI

### Storage Security
- All files stored in Firebase Storage only — Firestore holds URLs, never binary
- `onNodeDeleted` Cloud Function removes associated Storage files on node deletion
- GCS lifecycle rules (`storage-lifecycle.json`) auto-delete `tmp/` files after 7 days

## 🧪 TDD PROTOCOL (STRICT)

```
1. RED:    Write failing test first
2. GREEN:  Minimal code to pass
3. REFACTOR: Clean while green
4. COMMIT: Only when tests pass
```

### Test Coverage Requirements
| Layer | Minimum Coverage |
|-------|-----------------|
| Stores (ViewModel) | 90% |
| Services | 85% |
| Utils | 100% |
| Hooks | 80% |
| Components | 60% (critical paths) |

## 📦 STATE MANAGEMENT (Zustand + TanStack Query)

```typescript
// Zustand: Local/UI state (canvas, selections, UI flags)
// TanStack Query: Server state (user profile, workspace data)

// Store pattern
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: Set<string>;
  // Actions are in the store
  addNode: (node: Node) => void;
  selectNode: (id: string) => void;
}
```

### Canvas Store Architecture

The canvas store uses a **factory slice pattern** to stay under 300 lines:
- `canvasStore.ts` (~120 lines) — thin orchestrator, re-exports `EMPTY_SELECTED_IDS`/`getNodeMap`
- `canvasStoreActions.ts` (~235 lines) — 6 factory functions spread into `create()`
- `canvasStoreUtils.ts` (~21 lines) — shared constants (avoids circular imports)

New store slices for upcoming features (synthesis, clustering) add ONE factory spread each.

### Toast Helpers

```typescript
// ✅ Use typed toast helpers (not raw addToast)
import { toast } from '@/shared/stores/toastStore';
toast.success(strings.canvas.nodeCopied);
toast.error(strings.errors.saveFailed);
```

### 🔴 CRITICAL: Zustand Selector Pattern (Prevents "Maximum Update Depth" Errors)

The **selector pattern is MANDATORY**. Bare store subscriptions cause cascading re-renders and infinite loops in ReactFlow.

```typescript
// ❌ ANTI-PATTERN - Subscribes to ENTIRE store (causes re-renders on ANY field change)
const { user, isLoading, setUser } = useAuthStore();

// ✅ CORRECT - Use selectors for state, getState() for actions
const user = useAuthStore((s) => s.user);
const isLoading = useAuthStore((s) => s.isLoading);

// For actions, use getState() - stable references, no re-render dependency
const handleSubmit = () => useAuthStore.getState().setUser(newUser);
```

**Why This Matters:**
- Bare destructuring subscribes to ENTIRE store object
- ANY field change → component re-renders → useEffect fires → updates store → cascades
- With 500+ nodes in ReactFlow, this causes "Maximum update depth exceeded" errors
- Selectors ensure component only re-renders when SPECIFIC field changes

**All Zustand Stores Require Selectors:**
- `useAuthStore` → `const user = useAuthStore((s) => s.user)`
- `useWorkspaceStore` → `const currentId = useWorkspaceStore((s) => s.currentWorkspaceId)`
- `useCanvasStore` → `const nodes = useCanvasStore((s) => s.nodes)`
- `useToastStore` → `const toasts = useToastStore((s) => s.toasts)`
- `useConfirmStore` → `const isOpen = useConfirmStore((s) => s.isOpen)`
- `useSettingsStore` → `const theme = useSettingsStore((s) => s.theme)`
- `useFocusStore` → `const focusedId = useFocusStore((s) => s.focusedNodeId)`
- `useKnowledgeBankStore` → `const entries = useKnowledgeBankStore((s) => s.entries)`

**Enforcement:** Regression test `src/__tests__/zustandSelectors.structural.test.ts` scans for all 8 anti-patterns and fails the build if any are found.

**Common Mistakes to Avoid:**

```typescript
// ❌ WRONG: Including selector in useEffect dependency
useEffect(() => {
  const currentId = useWorkspaceStore((s) => s.currentWorkspaceId);
  // ... do something
}, [useWorkspaceStore((s) => s.currentWorkspaceId)]); // DON'T DO THIS!

// ✅ CORRECT: Call selector outside useEffect, use value in dependency
const currentId = useWorkspaceStore((s) => s.currentWorkspaceId);
useEffect(() => {
  // ... do something with currentId
}, [currentId]);

// ❌ WRONG: Mixing selector and action in one hook call
const { user, setUser } = useAuthStore((s) => ({ user: s.user, setUser: s.setUser }));

// ✅ CORRECT: Selectors for state, getState() for actions
const user = useAuthStore((s) => s.user);
const handleUpdate = useCallback(() => {
  useAuthStore.getState().setUser(newUser);
}, []);
```

**Testing/Mocking:** See `src/shared/components/__tests__/Toast.test.tsx` for the canonical Zustand mock pattern (handles both selectors and `getState()`).

### 🔴 CRITICAL: Closure Variable Anti-Pattern (Causes Drag Lag)

**Never use closure variables inside selectors.** This causes selector functions to be recreated each render, leading to subscription churn during drag operations.

```typescript
// ❌ ANTI-PATTERN 2: Closure variable in selector
const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
const node = useCanvasStore((s) => getNodeMap(s.nodes).get(focusedNodeId));
// ↑ focusedNodeId is a CLOSURE VARIABLE - selector recreated each render!

// ✅ CORRECT: Stable selector + useMemo derivation
const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
const nodes = useCanvasStore((s) => s.nodes);
const node = useMemo(
    () => getNodeMap(nodes).get(focusedNodeId) ?? null,
    [nodes, focusedNodeId]
);
```

**Why Closure Variables Cause Problems:**
1. Selector function captures `focusedNodeId` in closure
2. When component re-renders, NEW selector function is created
3. Zustand sees different function reference → triggers re-subscription logic
4. During drag (60 updates/sec), this compounds across all visible nodes
5. Eventually causes "Maximum update depth exceeded"

**Enforcement:** Structural test detects `getNodeMap` inside selectors.

### 🔴 CRITICAL: useCallback Deps Must Not Include Reactive Zustand State

When a `useCallback` includes reactive Zustand state in its deps array, the callback reference changes every time that state changes — feeding re-renders back into components that consume it.

```typescript
// ❌ WRONG — callback recreated on every workspace switch
const handleSwitch = useCallback(async (id: string) => {
    if (id === currentWorkspaceId || !user) return;
    ...
}, [user, currentWorkspaceId]); // re-created on EVERY change

// ✅ CORRECT — read live values via ref, keep deps stable
const userRef = useRef(user);
const currentIdRef = useRef(currentWorkspaceId);
userRef.current = user;
currentIdRef.current = currentWorkspaceId;

const handleSwitch = useCallback(async (id: string) => {
    const curId = currentIdRef.current; // always fresh
    const currentUser = userRef.current;
    if (id === curId || !currentUser) return;
    ...
}, []); // stable — never recreated
```

### 🔴 CRITICAL: useEffect Deps Must Use Primitive Selectors, Not Object References

Selecting a Zustand object reference (`s.user`) in a `useEffect` dep causes the effect to re-run whenever the store reconstructs that object — even if the underlying data didn't change. Always select the primitive you actually need:

```typescript
// ❌ WRONG — entire user object triggers re-runs on any auth state update
const user = useAuthStore((s) => s.user);
useEffect(() => { ... }, [user]); // re-runs even if user.id didn't change

// ✅ CORRECT — primitive string; effect only re-runs when ID actually changes
const userId = useAuthStore((s) => s.user?.id);
useEffect(() => {
    if (!userId) return;
    const uid: string = userId; // narrowed for TypeScript
    ...
}, [userId]);
```

## ✅ COMMIT CONVENTIONS

Format: `type(scope): description`

| Type | Use |
|------|-----|
| feat | New feature |
| fix | Bug fix |
| refactor | Code change (no feature/fix) |
| test | Adding tests |
| docs | Documentation |
| perf | Performance |
| security | Security fix |

## 🗄️ FIRESTORE PATTERNS

### Query safety
- All `getDocs` calls **must** use `limit()` from `FIRESTORE_QUERY_CAP` in `firestoreQueryConfig.ts`
- Structural test `firestoreQueryCap.structural.test.ts` enforces this — build fails without it

### Write safety
- Writes ≤500 ops: use `runTransaction()` for read-then-write consistency
- Writes >500 ops: use `chunkedBatchWrite()` from `firebaseUtils.ts` (auto-chunks at 500)
- Never create a raw `writeBatch` and add unlimited ops to it

### Schema versioning
Every workspace and node document carries `schemaVersion: number`. On load, `migrationRunner.ts` applies all pending migrations in version order. Migrations must be:
- **Pure functions** (no side effects — no network calls)
- **Idempotent** (safe to run twice)
- **Backward-compatible** (old clients must still read new docs)

```typescript
// Adding a new migration — bump CURRENT_SCHEMA_VERSION
export const CURRENT_SCHEMA_VERSION = 3;

const migrations: Migration[] = [
    ...existingMigrations,
    {
        version: 3,
        name: 'add_my_new_field',
        migrateNode: (node) => ({ ...node, myField: node.myField ?? 'default' }),
    },
];
```

### Bundle-first loading
`loadUserWorkspaces` tries `loadWorkspaceBundle()` first (fast, cached). Bundle cache is invalidated automatically on workspace create/delete. Falls back to direct Firestore queries if bundle is unavailable.

## 🧹 LOGGING & ERROR HANDLING

**Always use the structured logger — never `console.*` directly:**

```typescript
import { logger } from '@/shared/services/logger';
logger.error('message', error, { contextKey: value }); // → Sentry + console
logger.warn('message', ...args);                        // → console only
logger.info('message', ...args);                        // → console only in dev
```

**Fire-and-forget async calls must have `.catch()`:**

```typescript
// ❌ Silent failure
void doAsyncThing();

// ✅ Surfaced failure
doAsyncThing().catch((err) => logger.warn('[context] thing failed:', err));
```

**`useEffect` async functions must have a single outer try/catch:**

```typescript
// ❌ Code before try{} can throw and leave state unresolved
async function load() {
    await setup();         // if this throws — loading state stuck!
    try { ... } catch {}
}

// ✅ Single wrapping try/catch
async function load() {
    try {
        await setup();
        ...
    } catch (err) {
        logger.error(...);
    }
}
```

## 🚫 TECH DEBT PREVENTION

Before ANY commit:
1. `npm run lint` → 0 errors
2. `npm run test` → 100% pass
3. `npm run build` → success
4. File audit: `find src -name "*.ts*" | xargs wc -l | awk '$1 > 300'` → empty
5. String audit: No inline strings in components
6. ID audit: No `Date.now()` for entity IDs — use `crypto.randomUUID()`
7. Selector audit: No object references in `useEffect` deps — use primitive selectors
8. Callback audit: No reactive Zustand state in `useCallback` deps — use `useRef`

**NO EXCEPTIONS. NO "TODO: fix later". NO SHORTCUTS.**
