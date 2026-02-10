# Unified Node Input Architecture (UNIA-SSOT) with Rich Link Previews

**Branch:** `feature/unia-ssot-with-link-previews`

Collapse 3 keyboard layers, component-local editing state, and fragile event propagation into a single-owner architecture where `canvasStore` owns editing state, one hook routes all input, and TipTap is controlled synchronously. **Enhanced with rich link preview metadata** for embedded web and social media links. Six phases for core UNIA, plus two additional phases for link preview infrastructure.

---

## Phase 1 — Store: Add Editing State + Link Preview Metadata to `canvasStore` (SSOT for "who is editing" + "link metadata")

**Goal:** `canvasStore` becomes the single owner of `editingNodeId`, `draftContent`, and link preview metadata. No component changes yet — old code still works, new state is additive.

1. **Add types** to `src/features/canvas/types/node.ts`:
   - Add `EditingState` interface (`editingNodeId: string | null`, `draftContent: string | null`, `inputMode: InputMode`).
   - Add `LinkPreviewMetadata` interface:
     ```typescript
     interface LinkPreviewMetadata {
       url: string;
       title?: string;
       description?: string;
       image?: string;        // OG image URL
       favicon?: string;      // Favicon URL
       domain?: string;       // Parsed domain
       cardType?: 'summary' | 'summary_large_image' | 'player' | 'app'; // Twitter Card type
       fetchedAt: number;     // Timestamp for cache invalidation
     }
     ```
   - Extend `IdeaNodeData` to include `linkPreviews: Record<string, LinkPreviewMetadata>` (keyed by URL).

2. **Add state + actions** to `canvasStore.ts`:
   - Add `editingNodeId`, `draftContent`, `inputMode`, and `linkPreviews` to `CanvasState`.
   - Add `startEditing(nodeId)`, `stopEditing()`, `updateDraft(content)`, `setInputMode(mode)` to `CanvasActions`.
   - Add `addLinkPreview(nodeId, url, metadata)` and `clearStalePreview(nodeId, url, ttl)` for managing link metadata.

3. **Add string resources** to `strings.ts` — add `linkPreview` section for "Loading preview...", "Preview unavailable", etc.

4. **Write tests first (TDD):** New test file `canvasStore.editing.test.ts`:
   - Test `startEditing` sets `editingNodeId` + clears previous, `stopEditing` nulls both fields, `updateDraft` writes `draftContent`.
   - Test `addLinkPreview(nodeId, url, metadata)` stores metadata keyed by URL.
   - Test `clearStalePreview` removes previews older than TTL (e.g., 24 hours).
   - Test `deleteNode` on the editing node also calls `stopEditing`.

**Tech debt incurred:** Store has new state that nothing reads yet (dead state). **Removed:** Phase 2 wires consumers.

---

## Phase 1.5 (Parallel) — Infrastructure: Create Link Preview Fetching Service

**Goal:** Decouple link metadata fetching from the UI. Provide a service that fetches OG tags, Twitter Card data, and caches results.

**Why Phase 1.5?** Link preview fetching is async and independent; can be built parallel to Phase 1 store setup.

1. **Create `src/features/canvas/services/linkPreviewService.ts`:**
   - Export `fetchLinkPreview(url: string): Promise<LinkPreviewMetadata>`
   - Use `fetch()` to GET the URL and parse `<meta>` tags (Open Graph + Twitter Card)
   - Parse meta tags:
     - `og:title`, `og:description`, `og:image` (Open Graph)
     - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` (Twitter Card)
     - `<link rel="icon">` or favicon.ico fallback
     - Extract domain from URL via URL API
   - **Error handling:** On fetch failure, return partial metadata (URL + domain only, no title/description)
   - **Timeout:** 5-second timeout to avoid hanging requests

2. **Create `src/features/canvas/services/linkPreviewCache.ts`:**
   - LRU or timestamp-based cache for previews
   - Cache key: URL hash
   - TTL: 24 hours (configurable)
   - Methods:
     - `getFromCache(url): LinkPreviewMetadata | null`
     - `setInCache(url, metadata): void`
     - `isStale(metadata, ttl): boolean`
   - **Persistence:** Save to `localStorage` under key `eden_link_previews` (or Firestore if applicable)

3. **Create `src/features/canvas/hooks/useLinkPreviewFetch.ts`:**
   - Hook that manages async link preview fetching + store updates
   - Signature: `useLinkPreviewFetch(nodeId: string, urls: string[])`
   - **Behavior:**
     - Check cache for each URL
     - For cache misses, fetch in parallel (Promise.allSettled)
     - On success, call `canvasStore.addLinkPreview(nodeId, url, metadata)`
     - On error, store minimal metadata (URL + domain + error flag)
     - Abort in-flight requests on unmount
   - **Debouncing:** Debounce fetches for 500ms after each draft update (to avoid fetching every keystroke)

4. **Write tests:** `linkPreviewService.test.ts`, `linkPreviewCache.test.ts`, `useLinkPreviewFetch.test.ts`
   - Mock `fetch()` to return OG/Twitter Card meta tags
   - Test cache hit/miss and TTL expiration
   - Test parallel fetching with failures and timeouts

**Tech debt incurred:** None — service is self-contained. **Removed:** Phase 2 wires it into editor.

---

## Phase 2 — Hook: Create `useNodeInput` (Single Input Router) + Wire Link Fetching

**Goal:** Replace the split `useIdeaCardKeyboard` + `useIdeaCardEditor` with one `useNodeInput(nodeId)` hook. **Enhanced:** Hook also detects URLs in draft and triggers `useLinkPreviewFetch`.

1. **Write tests first (TDD):** New test file `useNodeInput.test.ts`:
   - Test: view-mode Enter → calls `store.startEditing`
   - Test: view-mode printable key → calls `startEditing` + deferred `insertContent`
   - Test: edit-mode Escape → calls `store.stopEditing` + saves
   - Test: edit-mode Enter (no shift, no suggestion) → submits + stops editing
   - `isEditing` is derived from `store.editingNodeId === nodeId`
   - **NEW:** Test: `updateDraft` with URLs triggers `useLinkPreviewFetch` (debounced)
   - Blur → saves + stops editing

2. **Create `useNodeInput.ts`** in `src/features/canvas/hooks/`:
   - Single hook that:
     - Reads `editingNodeId` from `canvasStore` via selector, derives `isEditing`
     - Exposes one `handleKeyDown(e)` that internally branches: view-mode keys vs edit-mode keys
     - Calls `editor.setEditable(true)` **synchronously** inside `startEditing` before any `insertContent`
     - Uses `queueMicrotask` for initial character insertion
     - Calls `e.preventDefault()` + `e.stopPropagation()` for printable keys
     - Wires TipTap `onBlur` → `store.stopEditing()` + save
   - **NEW:** Integrates `useLinkPreviewFetch`:
     ```typescript
     const urlRegex = /https?:\/\/[^\s)]+/g;
     useEffect(() => {
       if (!isEditing) return;
       const urls = (draftContent || '').match(urlRegex) || [];
       useLinkPreviewFetch(nodeId, urls);  // Debounced inside the hook
     }, [draftContent, nodeId, isEditing]);
     ```

3. **Wire `onUpdate` in `useTipTapEditor`** — pass `onUpdate` callback that calls `store.updateDraft(markdown)`.

4. **Keep old hooks alive** — `useIdeaCardKeyboard` and `useIdeaCardEditor` remain importable but unused (Phase 3 switches consumers).

**Tech debt incurred:** Two parallel hook systems exist. **Removed:** Phase 3 switches `IdeaCard` to `useNodeInput`.

---

## Phase 3 — View: Rewire `IdeaCard` to `useNodeInput` + Store

**Goal:** `IdeaCard` drops all `useState` for `isEditing`/`inputMode`, uses store-derived state via `useNodeInput`. **Enhanced:** Render link previews in view mode.

1. **Write/update tests first (TDD):** Update `IdeaCard.test.tsx`:
   - Mock `canvasStore.editingNodeId` instead of local state
   - Test: keydown on contentArea fires once (no bubbling double-fire)
   - **NEW:** Test: link preview renders in view mode when metadata is available in store
   - **NEW:** Test: link preview shows title, description, image, domain

2. **Refactor `IdeaCard.tsx`**:
   - Remove `useState(isEditing)`, `useState(inputMode)`
   - Call `useNodeInput(id)` which returns `{ isEditing, inputMode, handleKeyDown, ... }`
   - Attach `handleKeyDown` to **only** the outer `contentArea` div
   - Remove `onKeyDown` prop from sub-components
   - **NEW:** Pass `linkPreviews` from store to content rendering:
     ```typescript
     const linkPreviews = useCanvasStore((s) => 
       s.nodes.find(n => n.id === id)?.data.linkPreviews || {}
     );
     ```

3. **Create new component `LinkPreviewCard.tsx`:**
   - Props: `LinkPreviewMetadata`
   - Renders:
     ```
     ┌─────────────────────────────────┐
     │  [favicon] Domain | Title       │
     │  Description (truncated)        │
     │  [Image thumbnail]              │
     └─────────────────────────────────┘
     ```
   - **Click behavior:** Opens link in new tab (target="_blank")
   - **CSS module:** `LinkPreviewCard.module.css` with responsive grid layout

4. **Update `IdeaCardContent.tsx`**:
   - Add new section in `SimpleCardContent` and `AICardContent` to render link previews
   - Only show previews in view mode (not during editing)
   - Position previews below the main content with visual separation

5. **Delete old hooks** — remove `useIdeaCardKeyboard.ts` and `useIdeaCardEditor.ts`

**Tech debt incurred:** `useKeyboardShortcuts` still uses fragile `isContentEditable` guard. **Removed:** Phase 4 fixes it.

---

## Phase 4 — Guard: Fix Global Shortcuts to Respect Editing State

**Goal:** `useKeyboardShortcuts` reads `editingNodeId` from the store — one reliable check instead of brittle DOM inspection.

1. **Write tests first (TDD):** Update `useKeyboardShortcuts.test.ts`:
   - Test: when `store.editingNodeId` is set, single-char keys are **not** intercepted
   - Test: when `editingNodeId` is null, they fire normally
   - `Cmd+N` still works regardless

2. **Refactor `useKeyboardShortcuts.ts`** — replace the `isEditable` DOM check with store-based guard

**Tech debt incurred:** None — clean replacement.

---

## Phase 5 — Lifecycle: Synchronous Editor Control + Draft Persistence + Auto-fetch on Paste

**Goal:** Eliminate async `useEffect` for `setEditable`. Wire `onUpdate` → `draftContent`. **Enhanced:** Detect pasted URLs and trigger preview fetch immediately.

1. **Write tests first (TDD):** Update `useTipTapEditor.test.ts`:
   - Test: `onUpdate` callback fires on content change
   - Test: `setEditable` is not called from `useEffect` (remove the effect)
   - **NEW:** Test: on paste event, extract URLs and trigger preview fetch (mock via hook)

2. **Remove the `useEffect` for `editable` sync** in `useTipTapEditor.ts`

3. **Add paste handler in `useNodeInput.ts`:**
   - On `editor.view.dom` paste event, extract URLs
   - Immediately call `useLinkPreviewFetch` (not debounced for paste)
   - Prevents waiting for `onUpdate` debounce when user explicitly pastes a link

4. **Add debounced auto-save** — 2s debounced effect for persist `draftContent`

**Tech debt incurred:** None — this phase removes async race.

---

## Phase 6 — Cleanup: Final Audit + Verify All Constraints

**Goal:** Ensure every file is < 300 lines, MVVM separation is clean, all string resources are used, no dead code remains.

1. **Audit file sizes** — verify new files:
   - `linkPreviewService.ts` < 100 lines
   - `linkPreviewCache.ts` < 80 lines
   - `useLinkPreviewFetch.ts` < 120 lines
   - `LinkPreviewCard.tsx` < 100 lines

2. **Verify MVVM** — Views (LinkPreviewCard) contain zero business logic. ViewModels (useLinkPreviewFetch) contain fetching logic. Model (canvasStore, linkPreviewCache) own all state.

3. **Verify SSOT** — link previews read from store only, fetching driven by store, no parallel state

4. **Run full test suite**, verify coverage ≥ current baseline

5. **Delete any dead code**

**Tech debt incurred:** None.

---

## Phase 7 (Optional, Post-Launch) — UX Enhancements for Link Previews

**Goal:** Improve link preview UX based on user feedback.

1. **Link editing UI** (Phase 7a):
   - Modal dialog to edit/remove links from draft
   - Show detected links in sidebar with preview thumbnails
   - One-click "remove link" from preview card

2. **Link metadata refresh** (Phase 7b):
   - Manual "refresh preview" button for stale metadata
   - Admin setting for cache TTL

3. **Social embeds** (Phase 7c):
   - Detect Twitter/X, YouTube, GitHub URLs
   - Embed via special card types (video player, embedded tweet, etc.)
   - Use `@tiptap/extension-embed` or custom embed extension

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  IdeaCard (View)                                            │
│  ├─ useNodeInput(id)                  [reads editingNodeId] │
│  ├─ TipTapEditor                                            │
│  └─ LinkPreviewCard[] (from store)                          │
└─────────────────────────────────────────────────────────────┘
                    ↓                         ↑
     ┌──────────────┴──────────────────────────────────┐
     ↓                                                  ↑
┌──────────────────────────┐      ┌──────────────────────┐
│ useNodeInput(nodeId)     │      │  canvasStore         │
│ ├─ isEditing             │  ←→  │ ├─ editingNodeId     │
│ ├─ draftContent          │      │ ├─ draftContent      │
│ ├─ handleKeyDown()       │      │ ├─ inputMode         │
│ └─ useLinkPreviewFetch() │      │ ├─ linkPreviews      │
│    (detects + fetches)   │      │ └─ node.data.links   │
└──────────────────────────┘      └──────────────────────┘
         ↓
    ┌────────────────────────────┐
    │ useLinkPreviewFetch(urls)  │
    │ ├─ linkPreviewCache        │ ←→ localStorage/Firestore
    │ └─ linkPreviewService      │
    └────────────────────────────┘
         ↓
    fetch(url) → parse OG/Twitter tags
```

---

## Data Flow: Adding a Link

```
1. User edits content in editor
   ↓
2. TipTap.onUpdate() → store.updateDraft(markdown)
   ↓
3. useNodeInput detects URL in draftContent regex
   ↓
4. Debounced useLinkPreviewFetch(nodeId, [urls])
   ├─ Check cache (linkPreviewCache.getFromCache)
   ├─ Fetch missing: linkPreviewService.fetchLinkPreview(url)
   └─ On success: store.addLinkPreview(nodeId, url, metadata)
   ↓
5. IdeaCard re-renders (store mutation) → shows LinkPreviewCard
```

---

## Further Considerations

1. **Cross-Origin Restrictions:** Fetching link metadata via browser fetch() may hit CORS. **Solution:** Proxy requests through a backend endpoint or use a service like `microlink.io` (free tier available).

2. **Performance:** Fetching 10 URLs on every keystroke is slow. **Solution:** Debounce (already in plan) + only fetch URLs in final saved content (Phase 5).

3. **Preview Caching:** Cache should survive browser refresh. **Solution:** Use `localStorage` or Firestore (if user syncs canvas).

4. **Mobile:** Link preview cards should be touch-friendly. **Solution:** Test on mobile, adjust card size (Phase 7).

5. **Accessibility:** Link previews need alt text for images, semantic HTML. **Solution:** Include in LinkPreviewCard component.

---

## Implementation Checklist

### Phase 1
- [ ] Add `LinkPreviewMetadata` type to `node.ts`
- [ ] Extend `IdeaNodeData` with `linkPreviews` field
- [ ] Add store state + actions (`addLinkPreview`, `clearStalePreview`)
- [ ] Write tests for store actions
- [ ] Add string resources for link preview labels

### Phase 1.5
- [ ] Create `linkPreviewService.ts` (fetch + parse OG/Twitter tags)
- [ ] Create `linkPreviewCache.ts` (LRU cache with TTL)
- [ ] Create `useLinkPreviewFetch.ts` hook
- [ ] Write tests for service, cache, hook

### Phase 2
- [ ] Create `useNodeInput.ts` consolidating keyboard logic
- [ ] Integrate `useLinkPreviewFetch` into `useNodeInput`
- [ ] Write tests for `useNodeInput` including URL detection
- [ ] Wire `onUpdate` to `store.updateDraft`

### Phase 3
- [ ] Refactor `IdeaCard.tsx` to use `useNodeInput`
- [ ] Create `LinkPreviewCard.tsx` component
- [ ] Update `IdeaCardContent.tsx` to render previews
- [ ] Delete old hooks (`useIdeaCardKeyboard`, `useIdeaCardEditor`)
- [ ] Update tests

### Phase 4
- [ ] Update `useKeyboardShortcuts.ts` to use store guard
- [ ] Update tests

### Phase 5
- [ ] Remove `useEffect` for `editable` sync
- [ ] Add paste handler for immediate URL detection
- [ ] Add debounced auto-save
- [ ] Update tests

### Phase 6
- [ ] Audit file sizes
- [ ] Verify MVVM, SSOT, coverage
- [ ] Clean up dead code

---

## Timeline & Resources

- **Total effort:** 20–25 hours (core UNIA: 13–18h + link previews: 7–10h)
- **Recommended pace:** One phase per week
- **Team:** 1–2 engineers
- **Dependencies:** `@tiptap/starter-kit`, `@tiptap/extension-link` (already available)
- **Optional:** Microlink API for CORS-safe link preview fetching

