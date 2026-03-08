# Phase 8: Advanced Search — Find Anything Instantly (AMENDED)

## Critical Issues Fixed from Original Plan

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **TF-IDF API mismatch** — plan's `findSimilar` assumed `tfidfScore` returns `Map<string, number>` (vector). Actual API returns `number` (scalar). `cosineSimilarity` over Map vectors has no data source. | CRITICAL | Add `buildTFIDFVector()` to `tfidfScorer.ts` (SSOT). `findSimilar` consumes vectors, not scalars. |
| 2 | **No `useReducer`** — plan used `useState` for query + filters. User requires clean one-shot `useReducer` dispatch, isolated from canvas store. | CRITICAL | New `searchReducer.ts` (pure function), `useSearch` consumes via `useReducer`. |
| 3 | **Fuzzy match consecutive bonus bug** — after `qi++`, `lq[qi - 1]` is current char, not previous. Bonus check is wrong. | BUG | Track `lastMatchIdx` variable instead. |
| 4 | **`highlightRanges.ts` too small** — 25 lines for one export. Violates "no premature abstraction." | DESIGN | Merge into `fuzzyMatch.ts` (~60 lines total, under 75). |
| 5 | **Dropped `prompt` backward compat** — existing search checks legacy `prompt` field. Plan only searches heading/output/tags. | REGRESSION | Maintain `prompt` fallback in `useSearch` (heading > prompt > output priority). |
| 6 | **No integration tests** — user explicitly requires integration tests per sub-phase. | MISSING | Each sub-phase includes integration test file. |
| 7 | **Security gaps** — no input sanitization, no XSS protection for highlight rendering, no query length limit. | SECURITY | React elements for highlights (no `dangerouslySetInnerHTML`), query length cap, tag validation via Zod. |
| 8 | **NodeContextMenu line count wrong** — plan says "stays under 100 lines." Already 148 lines. | INACCURATE | Extract "Find Similar" trigger to `useNodeContextActions` hook (separation of concerns). |
| 9 | **No debounce for TF-IDF** — `findSimilarNodes` is O(n²). Running on every keystroke is a performance hazard. | PERF | "Find Similar" is on-demand (button click), NOT keystroke-driven. Add `useMemo` guard. |

---

## Problem Statement

Current search (`useSearch.ts`, 105 lines) does case-insensitive substring matching on `heading` and `output` fields only. As users accumulate hundreds of nodes, this breaks down:

- **No tag filtering** — users tag nodes but can't search by tag
- **No fuzzy matching** — "brainstrom" won't find "brainstorm"
- **No content-type filtering** — can't search "only nodes with AI output"
- **No date filtering** — can't find "what I worked on last week"
- **No semantic similarity** — TF-IDF scorer exists (`tfidfScorer.ts`, 74 lines) but isn't used
- **Results lack context** — no snippet highlighting

## Architecture Decisions (Amended)

### State Management: `useReducer` (NOT Zustand)

Search state is **transient UI state** — no persistence, no cross-component sharing. `useReducer` provides:
- **One-shot atomic updates** — no cascading `setState` calls
- **Testable reducer** — pure function, zero React dependency
- **Complete isolation** from canvas store (canvas data read via selectors, search state in local reducer)

```
Dispatch chain:
  User types → dispatch({ type: 'SET_QUERY' }) → reducer → new state
  → useMemo recomputes results from (nodes × filters × query)
  → React renders once

NO intermediate renders. NO cascade. NO stale closures.
```

### Zustand Read-Only Pattern

Canvas data is read via selectors — **never mutated** by search:
```typescript
const nodes = useCanvasStore((s) => s.nodes);     // selector: re-render only on nodes change
const edges = useCanvasStore((s) => s.edges);      // selector: re-render only on edges change
```
No `useStore()` destructuring. No closure variables in selectors.

### Security Contract

- **No `dangerouslySetInnerHTML`** — highlights rendered via React elements (`splitByRanges` → `<mark>`)
- **Query length cap** — max 200 characters (prevents memory abuse)
- **Tag validation** — reuses Zod `tagNameSchema` from `schemas.ts`
- **No regex from user input** — fuzzy match uses character comparison, never `new RegExp(userInput)`
- **Date validation** — `isNaN(date.getTime())` guard on filter inputs

### DRY / SSOT

- Tokenization: reuse `tokenizeRaw()` from `relevanceScorer.ts` (SSOT for tokenization)
- TF-IDF vectors: add `buildTFIDFVector()` to `tfidfScorer.ts` (SSOT for TF-IDF math)
- Cosine similarity: pure function in `findSimilar.ts` (search-specific)
- Strings: new `searchStrings.ts` file imported into `strings.ts` (follows feature-first pattern)

---

## Sub-phase 8A: Search Filter Types & Predicates

### What We Build

Type definitions for filters, composable predicate functions, and input validation.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/types/search.ts` | EDIT | ~45 (from 13) |
| `src/features/search/services/searchFilters.ts` | NEW | ~55 |
| `src/features/search/services/__tests__/searchFilters.test.ts` | NEW | ~90 |
| `src/features/search/__tests__/searchFilters.integration.test.ts` | NEW | ~50 |

### Implementation

**Extended `search.ts`** (~45 lines):

```typescript
export interface SearchResult {
    nodeId: string;
    workspaceId: string;
    workspaceName: string;
    matchedContent: string;
    matchType: 'heading' | 'prompt' | 'output' | 'tag';
    relevance: number;
    highlightRanges: ReadonlyArray<{ start: number; end: number }>;
}

export interface SearchFilters {
    tags?: string[];
    dateRange?: { from: Date | null; to: Date | null };
    contentType?: ContentTypeFilter;
    workspaceId?: string;
}

export type ContentTypeFilter =
    | 'all'
    | 'hasOutput'
    | 'hasAttachments'
    | 'hasConnections'
    | 'noOutput';

/** Type guard: at least one filter is active */
export function hasActiveFilters(f: SearchFilters): boolean {
    return Boolean(
        f.tags?.length || f.dateRange?.from || f.dateRange?.to
        || (f.contentType && f.contentType !== 'all') || f.workspaceId
    );
}
```

**`searchFilters.ts`** (~55 lines) — pure predicate functions:

```typescript
export function matchesTags(node: CanvasNode, tags: string[]): boolean {
    const nodeTags = node.data?.tags ?? [];
    return tags.some((tag) => nodeTags.includes(tag));
}

export function matchesDateRange(node: CanvasNode, from: Date | null, to: Date | null): boolean {
    const updated = node.updatedAt ?? node.createdAt;
    if (!updated) return true;
    const time = updated instanceof Date ? updated.getTime() : new Date(updated).getTime();
    if (isNaN(time)) return true; // Security: invalid dates don't crash
    if (from && !isNaN(from.getTime()) && time < from.getTime()) return false;
    if (to && !isNaN(to.getTime()) && time > to.getTime()) return false;
    return true;
}

export function matchesContentType(
    node: CanvasNode, filter: ContentTypeFilter, edges: CanvasEdge[]
): boolean {
    if (filter === 'all') return true;
    if (filter === 'hasOutput') return Boolean(node.data?.output?.trim());
    if (filter === 'hasAttachments') return (node.data?.attachments?.length ?? 0) > 0;
    if (filter === 'noOutput') return !node.data?.output?.trim();
    if (filter === 'hasConnections') {
        return edges.some((e) => e.source === node.id || e.target === node.id);
    }
    return true;
}

export function applyFilters(
    nodes: CanvasNode[], edges: CanvasEdge[], filters: SearchFilters
): CanvasNode[] {
    return nodes.filter((node) => {
        if (filters.tags?.length && !matchesTags(node, filters.tags)) return false;
        if (filters.dateRange && !matchesDateRange(node, filters.dateRange.from, filters.dateRange.to)) return false;
        if (filters.contentType && !matchesContentType(node, filters.contentType, edges)) return false;
        if (filters.workspaceId && node.workspaceId !== filters.workspaceId) return false;
        return true;
    });
}
```

### TDD Tests

**Unit tests** (`searchFilters.test.ts`, ~90 lines):
```
1. matchesTags returns true when node has any matching tag
2. matchesTags returns false when no tags match
3. matchesTags handles undefined tags gracefully
4. matchesDateRange includes nodes within range
5. matchesDateRange excludes nodes outside range
6. matchesDateRange handles null from/to (open-ended)
7. matchesDateRange handles invalid Date (NaN) — security test
8. matchesContentType 'hasOutput' filters correctly
9. matchesContentType 'hasAttachments' filters correctly
10. matchesContentType 'hasConnections' checks edges
11. matchesContentType 'noOutput' returns nodes without AI output
12. applyFilters composes all predicates (AND logic)
13. applyFilters with no filters returns all nodes
14. applyFilters with workspace scope limits results
```

**Integration test** (`searchFilters.integration.test.ts`, ~50 lines):
```
1. applyFilters with real CanvasNode shapes from canvas store
2. Filter composition: tag + date + contentType all applied
3. Edge case: empty node array
```

### Tech Debt Checkpoint

- [ ] `searchFilters.ts` under 60 lines
- [ ] Pure functions, no side effects, no imports of React/stores
- [ ] Date validation guards NaN (security)
- [ ] Zero lint errors
- [ ] All 14 unit + 3 integration tests pass
- [ ] `npm run build` succeeds

---

## Sub-phase 8B: Fuzzy Match & Highlight (Consolidated)

### What We Build

Fuzzy matcher + highlight segmenter in **one file** (eliminates premature `highlightRanges.ts` abstraction).

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/services/fuzzyMatch.ts` | NEW | ~60 |
| `src/features/search/services/__tests__/fuzzyMatch.test.ts` | NEW | ~100 |

### Implementation

**`fuzzyMatch.ts`** (~60 lines) — fixed consecutive bonus bug + highlight segments:

```typescript
export interface FuzzyResult {
    matches: boolean;
    score: number;
    ranges: ReadonlyArray<{ start: number; end: number }>;
}

export interface TextSegment {
    text: string;
    highlighted: boolean;
}

const MAX_QUERY_LENGTH = 200; // Security: prevent excessive computation

export function fuzzyMatch(query: string, text: string): FuzzyResult {
    if (!query || !text || query.length > MAX_QUERY_LENGTH) {
        return { matches: false, score: 0, ranges: [] };
    }
    const lq = query.toLowerCase();
    const lt = text.toLowerCase();

    // Exact substring = highest score
    const exactIdx = lt.indexOf(lq);
    if (exactIdx !== -1) {
        return { matches: true, score: 1.0, ranges: [{ start: exactIdx, end: exactIdx + lq.length }] };
    }

    // Subsequence match with consecutive bonus (FIXED: track lastMatchIdx)
    let qi = 0;
    let score = 0;
    let lastMatchIdx = -2; // -2 so first match can't be "consecutive"
    const ranges: Array<{ start: number; end: number }> = [];
    let rangeStart = -1;

    for (let ti = 0; ti < lt.length && qi < lq.length; ti++) {
        if (lt[ti] === lq[qi]) {
            if (rangeStart === -1) rangeStart = ti;
            score += 1;
            if (ti === lastMatchIdx + 1) score += 0.5; // consecutive bonus
            lastMatchIdx = ti;
            qi++;
        } else if (rangeStart !== -1) {
            ranges.push({ start: rangeStart, end: ti });
            rangeStart = -1;
        }
    }
    if (rangeStart !== -1 && qi > 0) {
        ranges.push({ start: rangeStart, end: lastMatchIdx + 1 });
    }

    const matched = qi === lq.length;
    return {
        matches: matched,
        score: matched ? Math.min(score / (lq.length * 1.5), 0.99) : 0, // cap below 1.0 (exact only = 1.0)
        ranges: matched ? ranges : [],
    };
}

/** Split text into highlighted/non-highlighted segments for safe React rendering */
export function splitByRanges(
    text: string, ranges: ReadonlyArray<{ start: number; end: number }>
): TextSegment[] {
    if (ranges.length === 0) return [{ text, highlighted: false }];
    const segments: TextSegment[] = [];
    let cursor = 0;
    for (const { start, end } of ranges) {
        if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
        segments.push({ text: text.slice(start, end), highlighted: true });
        cursor = end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
    return segments;
}
```

### TDD Tests (~100 lines)

```
1. Exact match returns score 1.0
2. Subsequence match returns score < 1.0
3. No match returns { matches: false }
4. Case insensitive matching
5. Consecutive characters get bonus (higher score than scattered)
6. Empty query returns no match
7. Query exceeding MAX_QUERY_LENGTH returns no match (security)
8. "brainstrom" fuzzy-matches "brainstorm"
9. splitByRanges produces correct segments for single range
10. splitByRanges handles no ranges (full text, not highlighted)
11. splitByRanges handles multiple ranges
12. splitByRanges handles adjacent ranges
13. splitByRanges handles range at start of text
14. splitByRanges handles range at end of text
```

### Tech Debt Checkpoint

- [ ] `fuzzyMatch.ts` under 65 lines (two exports, no separate file for highlight)
- [ ] Pure functions, zero dependencies
- [ ] MAX_QUERY_LENGTH enforced (security)
- [ ] Score capped at 0.99 for fuzzy (1.0 reserved for exact match)
- [ ] Zero lint errors
- [ ] All 14 tests pass

---

## Sub-phase 8C: Search Reducer & Enhanced useSearch

### What We Build

A pure `searchReducer` function and an upgraded `useSearch` hook that composes 8A + 8B via `useReducer`.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/hooks/searchReducer.ts` | NEW | ~35 |
| `src/features/search/hooks/__tests__/searchReducer.test.ts` | NEW | ~45 |
| `src/features/search/hooks/useSearch.ts` | REWRITE | ~75 |
| `src/features/search/__tests__/useSearch.test.ts` | EXTEND | ~300 (from 256) |
| `src/features/search/__tests__/useSearch.integration.test.ts` | NEW | ~60 |

### Implementation

**`searchReducer.ts`** (~35 lines) — pure function, completely isolated:

```typescript
import type { SearchFilters } from '../types/search';

export interface SearchState {
    query: string;
    filters: SearchFilters;
}

export type SearchAction =
    | { type: 'SET_QUERY'; query: string }
    | { type: 'SET_FILTER'; filter: Partial<SearchFilters> }
    | { type: 'CLEAR_FILTERS' }
    | { type: 'CLEAR_ALL' };

export const INITIAL_SEARCH_STATE: SearchState = {
    query: '',
    filters: {},
};

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
    switch (action.type) {
        case 'SET_QUERY':
            return { ...state, query: action.query.slice(0, 200) }; // Security: length cap
        case 'SET_FILTER':
            return { ...state, filters: { ...state.filters, ...action.filter } };
        case 'CLEAR_FILTERS':
            return { ...state, filters: {} };
        case 'CLEAR_ALL':
            return INITIAL_SEARCH_STATE;
    }
}
```

**Upgraded `useSearch.ts`** (~75 lines):

```typescript
export function useSearch(): UseSearchReturn {
    const [state, dispatch] = useReducer(searchReducer, INITIAL_SEARCH_STATE);

    // Read-only selectors — NO store mutations from search
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const workspaces = useWorkspaceStore((s) => s.workspaces);

    const workspaceMap = useMemo(() => {
        const map = new Map<string, string>();
        workspaces.forEach((ws) => {
            if (ws.type !== 'divider') map.set(ws.id, ws.name);
        });
        return map;
    }, [workspaces]);

    const results = useMemo((): SearchResult[] => {
        const { query, filters } = state;
        const filtered = applyFilters(nodes, edges, filters);

        if (!query.trim()) {
            if (hasActiveFilters(filters)) {
                return filtered.map((node) => ({
                    nodeId: node.id, workspaceId: node.workspaceId,
                    workspaceName: workspaceMap.get(node.workspaceId) ?? '',
                    matchedContent: node.data?.heading ?? '',
                    matchType: 'heading' as const, relevance: 1.0, highlightRanges: [],
                }));
            }
            return [];
        }

        // Fuzzy match: heading > prompt (legacy) > output > tags
        const searchResults: SearchResult[] = [];
        for (const node of filtered) {
            // ... heading match, prompt fallback, output match, tag match
            // Each uses fuzzyMatch() and pushes to searchResults
        }
        return searchResults.sort((a, b) => b.relevance - a.relevance);
    }, [state, nodes, edges, workspaceMap]);

    const search = useCallback((q: string) => dispatch({ type: 'SET_QUERY', query: q }), []);
    const setFilters = useCallback((f: Partial<SearchFilters>) => dispatch({ type: 'SET_FILTER', filter: f }), []);
    const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);
    const clear = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);

    return { query: state.query, filters: state.filters, results, search, setFilters, clearFilters, clear };
}
```

**Key design decisions:**
- `useReducer` is one-shot: every dispatch → single state transition → single `useMemo` recompute
- Canvas store read via selectors (re-render only when nodes/edges/workspaces change)
- No `useEffect` in the hook — derived state via `useMemo` only (no stale closures)
- Backward compatible: `search(query)` and `clear()` still work for existing consumers

### TDD Tests

**Reducer unit tests** (`searchReducer.test.ts`, ~45 lines):
```
1. SET_QUERY updates query
2. SET_QUERY caps at 200 chars (security)
3. SET_FILTER merges partial filter
4. SET_FILTER preserves existing filters
5. CLEAR_FILTERS resets filters but keeps query
6. CLEAR_ALL resets to initial state
7. Reducer returns same state for unknown action type
```

**Extended useSearch tests** (add to existing, ~300 lines total):
```
Existing 11 tests: PRESERVED (backward compatibility)
12. Empty query + tag filter = all nodes with that tag
13. Query matches heading with fuzzy matching ("brainstrom" → "brainstorm")
14. Query matches tags
15. Tag filter narrows results
16. Date range filter narrows results
17. Content type 'hasOutput' filter narrows results
18. Workspace scope filter narrows results
19. Results include highlightRanges
20. Filters compose (tag + date = AND)
21. Results sorted by relevance (heading > prompt > output > tag)
22. clearFilters resets filters but keeps query
23. Legacy prompt fallback still works (backward compat)
```

**Integration test** (`useSearch.integration.test.ts`, ~60 lines):
```
1. Full flow: type query → get fuzzy results → apply filter → results narrow
2. Clear all resets everything
3. Filter-only mode (no query) returns all matching nodes
```

### Tech Debt Checkpoint

- [ ] `searchReducer.ts` under 40 lines, pure function
- [ ] `useSearch.ts` under 75 lines (hook limit)
- [ ] Zero `useEffect` in `useSearch` — all derived via `useMemo`
- [ ] No Zustand anti-patterns (selectors only, no destructuring)
- [ ] No closure variables in selectors
- [ ] Existing 11 tests still pass (backward compat)
- [ ] Zero lint errors

---

## Sub-phase 8D: Filter Bar UI & String Resources

### What We Build

Filter bar component, search string resources, and SearchBar enhancement with highlight rendering.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/strings/searchStrings.ts` | NEW | ~30 |
| `src/shared/localization/strings.ts` | EDIT | Import searchStrings, replace inline search object |
| `src/features/search/components/SearchFilterBar.tsx` | NEW | ~85 |
| `src/features/search/components/SearchFilterBar.module.css` | NEW | ~55 |
| `src/features/search/components/SearchBar.tsx` | EDIT | Integrate filter bar + highlight rendering |
| `src/features/search/components/SearchBar.module.css` | EDIT | Add highlight + filter styles |
| `src/features/search/components/__tests__/SearchFilterBar.test.tsx` | NEW | ~75 |
| `src/features/search/__tests__/searchUI.integration.test.tsx` | NEW | ~60 |

### Implementation

**`searchStrings.ts`** (~30 lines):

```typescript
export const searchStrings = {
    placeholder: 'Search notes...',
    noResults: 'No results found',
    resultsCount: 'results',
    inWorkspace: 'in',
    prompt: 'Prompt',
    heading: 'Heading',
    output: 'Output',
    tag: 'Tag',
    // Filter bar
    filterToggle: 'Toggle filters',
    filterClear: 'Clear all filters',
    filterTags: 'Tags',
    filterDateRange: 'Date range',
    filterDateFrom: 'From',
    filterDateTo: 'To',
    filterContentType: 'Content type',
    contentTypeAll: 'All',
    contentTypeHasOutput: 'Has AI output',
    contentTypeHasAttachments: 'Has attachments',
    contentTypeHasConnections: 'Has connections',
    contentTypeNoOutput: 'Empty nodes',
    activeFilters: 'active filters',
    findSimilar: 'Find similar',
    similarResults: 'Similar nodes',
    noSimilarResults: 'No similar nodes found',
} as const;
```

**SearchFilterBar** (~85 lines) — horizontal bar below search input:
- **Tag chips**: Multi-select from tags found across all nodes (computed via `useMemo`)
- **Date range**: Native `<input type="date">` (no external dependency)
- **Content type**: `<select>` dropdown
- **Active filter badge**: Shows count of active filters
- **Clear all button**: `dispatch({ type: 'CLEAR_FILTERS' })`

**SearchBar highlight rendering** — safe React elements, NO `dangerouslySetInnerHTML`:

```typescript
function HighlightedText({ text, ranges }: { text: string; ranges: ... }) {
    const segments = splitByRanges(text, ranges);
    return (
        <>
            {segments.map((seg, i) =>
                seg.highlighted ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>
            )}
        </>
    );
}
```

### TDD Tests

**SearchFilterBar tests** (~75 lines):
```
1. Renders tag chips, date inputs, content type dropdown
2. Selecting a tag calls dispatch with SET_FILTER + tags
3. Setting date range calls dispatch with SET_FILTER + dateRange
4. Content type dropdown updates filter
5. Active filter count badge displays correct number
6. Clear all button dispatches CLEAR_FILTERS
7. Filter bar toggles on filter icon click
8. All labels from searchStrings (no hardcoded text)
9. Invalid date input is ignored (NaN guard)
```

**Integration test** (`searchUI.integration.test.tsx`, ~60 lines):
```
1. SearchBar + FilterBar: typing query shows fuzzy results with highlights
2. Toggling filter bar and applying tag filter narrows results
3. Clearing all resets search and filters
```

### Tech Debt Checkpoint

- [ ] `SearchFilterBar.tsx` under 90 lines
- [ ] `SearchBar.tsx` under 110 lines after edits
- [ ] ALL strings from `searchStrings` (zero hardcoded text)
- [ ] ALL CSS uses `var(--color-*)` / `var(--space-*)` / `var(--radius-*)` variables
- [ ] No `dangerouslySetInnerHTML` — safe React elements for highlights
- [ ] Native date inputs (no external date picker dependency)
- [ ] Inline `search: { ... }` in `strings.ts` replaced with `search: searchStrings`
- [ ] Zero lint errors

---

## Sub-phase 8E: "Find Similar" Semantic Search

### What We Build

TF-IDF cosine similarity for node-to-node semantic search. Triggered from context menu or search UI button.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/knowledgeBank/services/tfidfScorer.ts` | EDIT | Add `buildTFIDFVector` (~12 lines) |
| `src/features/search/services/findSimilar.ts` | NEW | ~55 |
| `src/features/search/services/__tests__/findSimilar.test.ts` | NEW | ~80 |
| `src/features/search/hooks/useFindSimilar.ts` | NEW | ~35 |
| `src/features/search/hooks/__tests__/useFindSimilar.test.ts` | NEW | ~55 |
| `src/features/canvas/components/nodes/NodeContextMenu.tsx` | EDIT | Add "Find Similar" menu item (~3 lines) |

### Implementation

**SSOT: `buildTFIDFVector` added to `tfidfScorer.ts`** (~12 new lines):

```typescript
/**
 * Build a TF-IDF vector for a document against a corpus IDF map.
 * Returns Map<term, tf*idf> for cosine similarity computation.
 */
export function buildTFIDFVector(
    tokens: readonly string[],
    idfMap: ReadonlyMap<string, number>
): Map<string, number> {
    const vec = new Map<string, number>();
    const unique = new Set(tokens);
    for (const term of unique) {
        const tf = computeTF(tokens, term);
        const idf = idfMap.get(term) ?? 0;
        if (tf > 0 && idf > 0) vec.set(term, tf * idf);
    }
    return vec;
}
```

This keeps `tfidfScorer.ts` at ~87 lines (under 100). SSOT: all TF-IDF math lives here.

**`findSimilar.ts`** (~55 lines) — uses SSOT imports:

```typescript
import { buildCorpusIDF, buildTFIDFVector } from '@/features/knowledgeBank/services/tfidfScorer';
import { tokenizeRaw } from '@/features/knowledgeBank/services/relevanceScorer';
import type { CanvasNode } from '@/features/canvas/types/node';

export interface SimilarResult {
    nodeId: string;
    similarity: number;
    heading: string;
}

const SIMILARITY_THRESHOLD = 0.1;

export function findSimilarNodes(
    sourceNodeId: string, nodes: CanvasNode[], topN = 10
): SimilarResult[] {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return [];

    const sourceText = getNodeText(sourceNode);
    if (!sourceText.trim()) return [];

    // Build tokenized corpus (reuses SSOT tokenizeRaw)
    const corpus = nodes.map((n) => tokenizeRaw(getNodeText(n)));
    const idf = buildCorpusIDF(corpus);

    const sourceIdx = nodes.findIndex((n) => n.id === sourceNodeId);
    const sourceVec = buildTFIDFVector(corpus[sourceIdx] ?? [], idf);

    const results: SimilarResult[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (i === sourceIdx) continue;
        const vec = buildTFIDFVector(corpus[i] ?? [], idf);
        const sim = cosineSimilarity(sourceVec, vec);
        if (sim > SIMILARITY_THRESHOLD) {
            results.push({ nodeId: nodes[i]!.id, similarity: sim, heading: nodes[i]!.data?.heading ?? '' });
        }
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

function getNodeText(node: CanvasNode): string {
    return [node.data?.heading, node.data?.output].filter(Boolean).join(' ');
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0, magA = 0, magB = 0;
    for (const [term, score] of a) {
        dot += score * (b.get(term) ?? 0);
        magA += score * score;
    }
    for (const [, score] of b) magB += score * score;
    return magA > 0 && magB > 0 ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}
```

**`useFindSimilar.ts`** (~35 lines) — on-demand computation, NOT keystroke-driven:

```typescript
export function useFindSimilar() {
    const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
    const nodes = useCanvasStore((s) => s.nodes);

    const results = useMemo(() => {
        if (!sourceNodeId) return [];
        return findSimilarNodes(sourceNodeId, nodes);
    }, [sourceNodeId, nodes]);

    const findSimilar = useCallback((nodeId: string) => setSourceNodeId(nodeId), []);
    const clearSimilar = useCallback(() => setSourceNodeId(null), []);

    return { results, isActive: sourceNodeId !== null, findSimilar, clearSimilar };
}
```

**Context menu integration** (~3 added lines to NodeContextMenu):
- Add `onFindSimilar?: () => void` prop
- Add `<MenuItem icon="🔎" label={strings.search.findSimilar} onClick={action(props.onFindSimilar)} />` under Organize group
- NodeContextMenu stays at ~155 lines (under 300)

### TDD Tests

**findSimilar unit tests** (~80 lines):
```
1. Returns empty for non-existent node
2. Returns empty for node with no text
3. Similar content nodes score high (>0.5)
4. Dissimilar content nodes excluded (below threshold)
5. Results sorted by similarity descending
6. Results capped at topN
7. Source node excluded from results
8. cosineSimilarity returns 1.0 for identical vectors
9. cosineSimilarity returns 0 for orthogonal vectors
10. cosineSimilarity returns 0 for empty vectors
11. getNodeText combines heading + output
```

**useFindSimilar hook tests** (~55 lines):
```
1. Initially returns no results and isActive=false
2. findSimilar(nodeId) activates and returns results
3. clearSimilar resets to initial state
4. Recomputes when nodes change
5. Handles missing source node gracefully
```

### Tech Debt Checkpoint

- [ ] `tfidfScorer.ts` under 90 lines after addition
- [ ] `findSimilar.ts` under 60 lines
- [ ] `useFindSimilar.ts` under 40 lines
- [ ] Reuses `tokenizeRaw` from relevanceScorer (DRY)
- [ ] Reuses `buildCorpusIDF` + `buildTFIDFVector` from tfidfScorer (SSOT)
- [ ] `cosineSimilarity` is exported (testable)
- [ ] NodeContextMenu under 160 lines after addition
- [ ] No closure variables in selectors
- [ ] Zero lint errors

---

## Sub-phase 8F: Structural & Security Tests

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/__tests__/advancedSearch.structural.test.ts` | NEW | ~50 |

### Structural Tests

```
1. useSearch accepts SearchFilters parameter (return type includes filters)
2. SearchResult includes highlightRanges field
3. fuzzyMatch is a pure function (no imports of stores/hooks/React)
4. searchFilters is a pure function (no imports of stores/hooks/React)
5. searchReducer is a pure function (no side effects)
6. findSimilar imports from tfidfScorer (reuse check — DRY)
7. findSimilar imports tokenizeRaw from relevanceScorer (SSOT tokenization)
8. No hardcoded strings in search components (grep scan of .tsx files)
9. SearchFilterBar.module.css uses only CSS variables (no hex colors)
10. No dangerouslySetInnerHTML in search components (XSS protection)
11. No `new RegExp(` with user input in search services (ReDoS protection)
```

### Security Audit Checklist

| Check | File | Verification |
|-------|------|-------------|
| XSS via highlights | SearchBar.tsx | Uses React elements, not `dangerouslySetInnerHTML` |
| ReDoS | fuzzyMatch.ts | Character comparison, no `RegExp` from user input |
| Query length bomb | searchReducer.ts | `.slice(0, 200)` cap in SET_QUERY |
| Invalid date crash | searchFilters.ts | `isNaN(date.getTime())` guard |
| Tag injection | SearchFilterBar.tsx | Tags rendered as text content, not HTML |
| Prototype pollution | searchReducer.ts | Spread only on known `SearchFilters` shape |

### Tech Debt Checkpoint

- [ ] All 11 structural tests pass
- [ ] Security audit: all 6 checks verified
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → 100% pass (including all existing tests)
- [ ] `npm run build` → success
- [ ] File audit: no file over 300 lines
- [ ] String audit: no inline strings in search components

---

## Phase 8 Summary

### Execution Order

| Sub-phase | What | Why This Order | Build Passes? |
|-----------|------|----------------|---------------|
| 8A | Filter types + predicates | Foundation — pure functions, no UI dependency | Yes |
| 8B | Fuzzy match + highlight (consolidated) | Used by enhanced useSearch in 8C | Yes |
| 8C | Search reducer + enhanced useSearch | Composes 8A + 8B, backward compatible | Yes |
| 8D | Filter bar UI + string resources | Consumes 8C hook, renders highlights | Yes |
| 8E | Find Similar (TF-IDF cosine) | Independent feature, reuses KB scorer | Yes |
| 8F | Structural + security tests | Validates final state | Yes |

### Net Impact

- **Files created**: 14 (services, hooks, components, CSS, tests, strings)
- **Files edited**: 6 (search.ts, useSearch.ts, SearchBar.tsx, SearchBar.module.css, tfidfScorer.ts, NodeContextMenu.tsx, strings.ts)
- **Net line count change**: ~+900 lines
- **External dependencies added**: 0
- **Zustand stores added**: 0 (search state via `useReducer`, completely isolated)

### Key Architecture Guarantees

| Guarantee | How |
|-----------|-----|
| No "Maximum update depth exceeded" | Zustand selectors only; no bare destructuring |
| No stale closures | Zero `useEffect` in `useSearch`; all derived via `useMemo` |
| No ReactFlow cascade | Search never mutates canvas store; read-only selectors |
| No closure variables in selectors | Structural test enforces |
| One-shot state updates | `useReducer` dispatch → single state transition |
| Security compliant | No `dangerouslySetInnerHTML`, no user-input RegExp, query length cap, date NaN guard |
| Backward compatible | Existing `search(query)` / `clear()` API preserved; existing 11 tests pass |
