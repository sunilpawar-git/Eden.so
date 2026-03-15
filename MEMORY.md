# MEMORY.md — Architectural Decision Log

> A living record of every significant architectural decision made during the project.
> Read this before touching any major subsystem. Update it when you make a new decision.

---

## Architecture Sprint — Hardening (Mar 2026)

### Context
A full production architecture audit was run against the BASB codebase, followed by a multi-phase hardening sprint and a post-sprint quality review. All decisions below were made and implemented during this period.

---

## Decision 1 — Structured Logger

**Problem:** ~40 raw `console.*` calls scattered across the codebase. Errors not reported to Sentry. No way to suppress logs in production.

**Decision:** Centralise all logging behind `src/shared/services/logger.ts`.

```typescript
logger.error(msg, error?, context?) // → Sentry captureException + console.error
logger.warn(msg, ...args)           // → console.warn only
logger.info(msg, ...args)           // → console.info, gated in production
```

**Enforcement:** `noConsoleLog.structural.test.ts` fails the build if any raw `console.*` call is found outside the logger itself.

---

## Decision 2 — Base64 Stripping Before Firestore Writes

**Problem:** TipTap `allowBase64: true` means base64 image data could leak into Firestore node documents, hitting the 1 MB document limit and causing silent data corruption.

**Decision:** `stripBase64Images()` in `src/shared/utils/contentSanitizer.ts` strips all `data:image/*;base64,...` payloads from node data before any Firestore write. Replaced with `[image-uploading]` placeholder during upload.

**Called in:** `saveNodes()`, `appendNode()` in `workspaceService.ts`.

**Enforcement:** `noBase64InFirestore.structural.test.ts`.

---

## Decision 3 — Firestore Query Caps

**Problem:** `getDocs(collection(db, 'nodes'))` with no `limit()` would fetch thousands of documents, causing cost explosions and UI freezes.

**Decision:** All `getDocs` calls must use `limit()`. Constants live in `src/config/firestoreQueryConfig.ts`:

```typescript
export const FIRESTORE_QUERY_CAP = 1000;   // nodes/edges per workspace
export const WORKSPACE_LIST_CAP = 100;     // workspaces per user
export const FIRESTORE_BATCH_DELETE_CAP = 500; // batch delete chunk size
```

**Enforcement:** `firestoreQueryCap.structural.test.ts`.

---

## Decision 4 — Node/Edge Ownership Fields

**Problem:** Node documents in Firestore lacked `userId` and `workspaceId` fields, making server-side rules rely solely on path matching.

**Decision:** Every node and edge write now includes `userId` and `workspaceId`. Firestore rules validate both the path-level auth AND `resource.data.userId == request.auth.uid` (defence in depth).

**Enforcement:** `firestoreRules.structural.test.ts`.

---

## Decision 5 — chunkedBatchWrite (Bug Fix)

**Problem:** `saveNodes` used a single `writeBatch` for the large-workspace path (>500 ops). Firestore rejects batches over 500 operations — this would silently crash saves for large workspaces.

**Decision:** `chunkedBatchWrite()` in `firebaseUtils.ts` splits any array of ops into 500-op chunks and commits each sequentially. `saveNodes` and `saveEdges` use this for the >500 path.

**runTransaction vs batch:**
- ≤500 ops → `runTransaction()` (read-then-write consistency)
- >500 ops → `chunkedBatchWrite()` (no read consistency, but safe for single-user workspaces)

---

## Decision 6 — Schema Versioning + Migration Runner

**Problem:** Firestore schema evolution relied on optional fields with no tracking. No way to know if a document was created before or after a schema change.

**Decision:** Every workspace and node document carries `schemaVersion: number`. `src/migrations/migrationRunner.ts` runs pending migrations on load — pure, idempotent, backward-compatible.

**Current version:** `CURRENT_SCHEMA_VERSION = 2`

**Rule:** New migrations must be added to `migrations: Migration[]` and `CURRENT_SCHEMA_VERSION` must be bumped. Migrations must not make network calls (pure functions only).

---

## Decision 7 — Web Worker for TF-IDF / Clustering

**Problem:** `computeClusters()` and `rankEntries()` ran on the main thread. On workspaces with 500+ nodes this caused visible UI lag and could trigger "Maximum update depth exceeded" if called during a render cycle.

**Decision:** Move heavy computation to `src/workers/knowledgeWorker.ts`. Client API is `knowledgeWorkerClient.ts` — Promise-based, with automatic main-thread fallback if Web Workers are unavailable.

**Crash guard:** After 3 worker crashes, `crashCount >= MAX_WORKER_CRASHES` permanently disables the worker and falls back to main-thread. Prevents spin-loop on persistent crashes.

---

## Decision 8 — Firestore Bundle Optimisation

**Problem:** Every page load fetched the full workspace list from Firestore — a cold-start latency hit proportional to the number of workspaces.

**Decision:**
1. `workspaceBundle` Cloud Function generates a Firestore Bundle containing the user's workspace list.
2. `bundleLoader.ts` calls the function, caches the result in `sessionStorage` (5-min TTL).
3. `loadUserWorkspaces` tries `loadWorkspaceBundle()` first; falls back to direct Firestore query if bundle is unavailable or stale.
4. Bundle cache is invalidated on workspace create/delete.

**Bundle cap** (`WORKSPACE_LIST_CAP = 100`) is shared via `functions/src/constants.ts` to prevent silent client/server divergence.

---

## Decision 9 — Storage Orphan Cleanup

**Problem:** When nodes were deleted, associated Storage files (images, attachments, thumbnails) were left as orphans indefinitely.

**Two-layer solution:**

1. **Client-side:** `cleanupDeletedNodeStorage()` in `nodeStorageCleanup.ts` extracts all Storage URLs from deleted node data and calls `deleteObject` via the client SDK. Called from `saveNodes` (diff-based) and `deleteWorkspace` (full sweep).

2. **Server-side:** `onNodeDeleted` Cloud Function triggered by `onDocumentDeleted` — catches any deletions that bypass the client (e.g. admin tools, other clients).

Both layers are idempotent — `deleteObject` on a missing file is a no-op.

---

## Decision 10 — Storage Lifecycle Policies

**Problem:** Temporary uploads in `tmp/` had no automatic cleanup. Storage costs would grow unbounded.

**Decision:** `storage-lifecycle.json` defines GCS lifecycle rules:
- `.tmp` files under `users/` → delete after 7 days
- `tmp/` prefix → delete after 30 days

`deploy.yml` runs `gsutil lifecycle set storage-lifecycle.json gs://$BUCKET` after every production deploy — infrastructure-as-code, not a manual ops step.

`scheduledStorageCleanup` Cloud Function runs daily as a belt-and-suspenders sweep for any files lifecycle rules miss.

---

## Decision 11 — Search Debounce

**Problem:** `SearchBar` fired search computation on every keystroke — expensive on large workspaces.

**Decision:** `useDebouncedCallback(fn, 250)` in `src/shared/hooks/useDebounce.ts` wraps all search triggers. Uses a `callbackRef` pattern to avoid stale closure issues.

---

## Decision 12 — useCallback Stability via useRef

**Problem:** `useWorkspaceSwitcher.switchWorkspace` and `useWorkspaceOperations.handleNewWorkspace` included reactive Zustand state (`user`, `currentWorkspaceId`) in their `useCallback` deps. This caused the callback reference to change on every workspace switch, re-triggering all consumers and feeding cascading re-renders near the canvas.

**Decision:** Read live values via `useRef` mirrors, keep `useCallback` deps as `[]`:

```typescript
const userRef = useRef(user);
const currentIdRef = useRef(currentWorkspaceId);
userRef.current = user;     // always fresh
currentIdRef.current = currentWorkspaceId;

const handleSwitch = useCallback(async (id) => {
    const curId = currentIdRef.current; // reads current value without being a dep
    ...
}, []); // stable reference — never recreated
```

**Applies to:** `useWorkspaceSwitcher`, `useWorkspaceOperations`.

---

## Decision 13 — Primitive Selectors in useEffect Dependencies

**Problem:** `useWorkspaceLoading` and `useWorkspaceLoader` both had `user` (object reference) in `useEffect` deps. If `useAuthStore` reconstructed the user object on any auth-related re-render, the entire workspace load pipeline fired again — duplicate Firestore reads and potential double-setState flicker.

**Decision:** Select the primitive you actually need:

```typescript
// In useWorkspaceLoading
const userId = useAuthStore((s) => s.user?.id); // string | undefined
useEffect(() => {
    if (!userId) return;
    const uid: string = userId;
    ...
}, [userId]); // only re-runs when the ID itself changes

// In useWorkspaceLoader
const userId = useAuthStore((s) => s.user?.id);
useEffect(() => { ... }, [userId, workspaceId]);
```

---

## Decision 14 — backfillNodeCount DRY Helper

**Problem:** The `nodeCount` backfill logic (counting nodes via `getCountFromServer` + fire-and-forget `setDoc`) was duplicated verbatim between `loadWorkspace` and `loadUserWorkspaces`.

**Decision:** Extract `backfillNodeCount(userId, workspaceId, docRef)` and `buildWorkspace(data, userId, nodeCount)` helpers inside `workspaceService.ts`. Both functions now call these. `workspaceService.ts` reduced from 304 lines to 281.

---

## Decision 15 — Migration v2 is a No-Op

`migration_002_ensure_userId_field` was implemented as `node.userId ?? undefined` — which is a mathematical no-op. The intent (backfilling `userId` on legacy nodes) cannot be achieved in a pure migration function because the runner has no access to the calling user's ID.

**Correct approach:** `userId` is written by `workspaceService.saveNodes` on every save. The next time a legacy node is saved, it gets `userId`. The migration version slot (v2) is preserved as a no-op to avoid resequencing subsequent migrations.

---

## Standing Rules Added to CLAUDE.md

These rules were codified as a result of the sprint:

1. **Primitive selectors in `useEffect` deps** — select `s.user?.id`, not `s.user`
2. **`useRef` mirrors for `useCallback` deps** — never include reactive Zustand state in callback deps
3. **Single outer `try/catch` in async `useEffect`** — code before `try{}` must not be able to throw and leave state unresolved
4. **`.catch()` on all fire-and-forget async** — `void fn()` is forbidden without a `.catch(logger.warn)`
5. **`chunkedBatchWrite` for large writes** — raw `writeBatch` is limited to 500 ops; anything larger must use the chunked helper
6. **`crypto.randomUUID()` for all IDs** — `Date.now()` is forbidden for entity IDs
7. **`useDebouncedCallback` for all search/filter inputs** — 250 ms minimum delay
8. **Heavy computation in Web Worker** — TF-IDF, clustering, similarity go through `knowledgeWorkerClient`
