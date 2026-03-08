# Phase 8: Advanced Search — Find Anything Instantly

## Problem Statement

Current search (`useSearch.ts`, 105 lines) does case-insensitive substring matching on `heading` and `output` fields only. It returns results sorted by a static relevance score (heading=1.0, output=0.8). As users accumulate hundreds of nodes across multiple workspaces, this breaks down:

- **No tag filtering** — users tag nodes meticulously but can't search by tag
- **No fuzzy matching** — "brainstrom" won't find "brainstorm"
- **No content-type filtering** — can't search "only nodes with AI output" or "only nodes with attachments"
- **No date filtering** — can't find "what I worked on last week"
- **No semantic similarity** — TF-IDF scorer exists (`tfidfScorer.ts`, 75 lines) but isn't used for search
- **No search in nested content** — list items, table cells, and attachment text are invisible to search
- **Results lack context** — matched content shown as raw text, no snippet highlighting

For a BASB app where retrieval is half the value, basic substring search is a serious limitation.

## Intended Solution

Enhance the existing search with **filters, fuzzy matching, snippet highlighting, and a "Find Similar" semantic search** that reuses the TF-IDF scorer. The search UI gains a filter bar (tags, date range, content type) and results show highlighted match snippets. "Find Similar" lets users select a node and discover related nodes across all workspaces — a powerful BASB "Organize" tool.

## Architecture Decisions

- **Extend existing module** — `src/features/search/` (no new feature module)
- **No new Zustand store** — search state stays local in `useSearch` hook
- **Fuzzy matching** — Levenshtein distance-based fuzzy match (pure function, ~30 lines). No external library.
- **TF-IDF "Find Similar"** — reuses existing `tfidfScorer.ts` functions (`computeTF`, `buildCorpusIDF`, `tfidfScore`). Computes similarity between a source node and all other nodes, returns top-N.
- **Filters are composable** — each filter is a predicate function. Filters are AND-composed (tag + date = both must match).
- **No server-side search** — all search is client-side over Zustand state. At 500-1000 nodes this is fast enough (<50ms). If the app scales beyond that, server-side search becomes Phase N+1.
- **Highlight via regex** — match positions marked in results, rendered with `<mark>` in SearchBar.
- **Analytics**: Reuse existing `'search'` tracking or add `'advanced_search'` to `SettingKey`.

---

## Sub-phase 8A: Search Filter Types & Predicates

### What We Build

Type definitions for filters and composable predicate functions.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/types/search.ts` | EDIT | Add SearchFilter, expand SearchResult |
| `src/features/search/services/searchFilters.ts` | NEW | ~55 |
| `src/features/search/services/__tests__/searchFilters.test.ts` | NEW | ~80 |

### Implementation

**Extended `search.ts`** (~40 lines total):

```typescript
export interface SearchResult {
  nodeId: string;
  workspaceId: string;
  workspaceName: string;
  matchedContent: string;
  matchType: 'heading' | 'prompt' | 'output' | 'tag';
  relevance: number;
  highlightRanges: Array<{ start: number; end: number }>; // NEW
}

export interface SearchFilters {
  tags?: string[];           // Match nodes with ANY of these tags
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  contentType?: ContentTypeFilter;
  workspaceId?: string;       // Scope to specific workspace
}

export type ContentTypeFilter =
  | 'all'
  | 'hasOutput'          // Nodes with AI-generated output
  | 'hasAttachments'     // Nodes with uploaded files
  | 'hasConnections'     // Nodes with edges
  | 'noOutput';          // Empty nodes (capture-only)
```

**`searchFilters.ts`** (~55 lines):

```typescript
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { SearchFilters, ContentTypeFilter } from '../types/search';

export function matchesTags(node: CanvasNode, tags: string[]): boolean {
  const nodeTags = node.data?.tags ?? [];
  return tags.some((tag) => nodeTags.includes(tag));
}

export function matchesDateRange(node: CanvasNode, from: Date | null, to: Date | null): boolean {
  const updated = node.updatedAt ?? node.createdAt;
  if (!updated) return true; // no date = include
  const time = updated instanceof Date ? updated.getTime() : new Date(updated).getTime();
  if (from && time < from.getTime()) return false;
  if (to && time > to.getTime()) return false;
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

```
1. matchesTags returns true when node has any matching tag
2. matchesTags returns false when no tags match
3. matchesDateRange includes nodes within range
4. matchesDateRange excludes nodes outside range
5. matchesDateRange handles null from/to (open-ended)
6. matchesContentType 'hasOutput' filters correctly
7. matchesContentType 'hasAttachments' filters correctly
8. matchesContentType 'hasConnections' checks edges
9. applyFilters composes all predicates (AND logic)
10. applyFilters with no filters returns all nodes
11. applyFilters with workspace scope limits results
```

### Tech Debt Checkpoint

- [ ] searchFilters.ts under 60 lines
- [ ] Pure functions, no side effects
- [ ] No external dependencies
- [ ] Zero lint errors

---

## Sub-phase 8B: Fuzzy Match & Highlight

### What We Build

A lightweight fuzzy matcher and a function that computes highlight ranges for matched text.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/services/fuzzyMatch.ts` | NEW | ~40 |
| `src/features/search/services/highlightRanges.ts` | NEW | ~25 |
| `src/features/search/services/__tests__/fuzzyMatch.test.ts` | NEW | ~60 |
| `src/features/search/services/__tests__/highlightRanges.test.ts` | NEW | ~40 |

### Implementation

**`fuzzyMatch.ts`** (~40 lines) — simple character-by-character subsequence match with scoring:

```typescript
export interface FuzzyResult {
  matches: boolean;
  score: number;         // 0-1, higher = better match
  ranges: Array<{ start: number; end: number }>;
}

export function fuzzyMatch(query: string, text: string): FuzzyResult {
  if (!query || !text) return { matches: false, score: 0, ranges: [] };
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();

  // Exact substring match = highest score
  const exactIdx = lt.indexOf(lq);
  if (exactIdx !== -1) {
    return {
      matches: true,
      score: 1.0,
      ranges: [{ start: exactIdx, end: exactIdx + lq.length }],
    };
  }

  // Subsequence match with consecutive bonus
  let qi = 0;
  let score = 0;
  const ranges: Array<{ start: number; end: number }> = [];
  let rangeStart = -1;

  for (let ti = 0; ti < lt.length && qi < lq.length; ti++) {
    if (lt[ti] === lq[qi]) {
      if (rangeStart === -1) rangeStart = ti;
      score += 1;
      if (ti > 0 && lt[ti - 1] === lq[qi - 1]) score += 0.5; // consecutive bonus
      qi++;
    } else if (rangeStart !== -1) {
      ranges.push({ start: rangeStart, end: ti });
      rangeStart = -1;
    }
  }
  if (rangeStart !== -1) ranges.push({ start: rangeStart, end: rangeStart + 1 });

  const matched = qi === lq.length;
  return {
    matches: matched,
    score: matched ? score / (lq.length * 1.5) : 0,
    ranges: matched ? ranges : [],
  };
}
```

**`highlightRanges.ts`** (~25 lines) — splits text into highlighted and non-highlighted segments for rendering:

```typescript
export interface TextSegment {
  text: string;
  highlighted: boolean;
}

export function splitByRanges(
  text: string,
  ranges: Array<{ start: number; end: number }>
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

### TDD Tests

```
1. Exact match returns score 1.0
2. Subsequence match returns lower score
3. No match returns { matches: false }
4. Case insensitive matching
5. Consecutive characters get bonus score
6. Empty query returns no match
7. splitByRanges produces correct segments
8. splitByRanges handles no ranges (full text, not highlighted)
9. splitByRanges handles adjacent ranges
10. "brainstrom" fuzzy-matches "brainstorm"
```

### Tech Debt Checkpoint

- [ ] fuzzyMatch under 45 lines
- [ ] highlightRanges under 30 lines
- [ ] Pure functions, zero dependencies
- [ ] Zero lint errors

---

## Sub-phase 8C: Enhanced useSearch Hook

### What We Build

Upgrade `useSearch` to accept filters, use fuzzy matching, and return highlight ranges.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/hooks/useSearch.ts` | REWRITE | ~75 |
| `src/features/search/__tests__/useSearch.test.ts` | REWRITE | ~120 |

### Implementation

**New `useSearch.ts`** (~75 lines):

```typescript
export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceMap = useMemo(() => /* same as before */, [workspaces]);

  const results = useMemo((): SearchResult[] => {
    // 1. Apply structural filters first (reduces search set)
    const filtered = applyFilters(nodes, edges, filters);

    // 2. If no query but filters active, return all filtered nodes
    if (!query.trim()) {
      if (hasActiveFilters(filters)) {
        return filtered.map((node) => ({
          nodeId: node.id,
          workspaceId: node.workspaceId,
          workspaceName: workspaceMap.get(node.workspaceId) ?? '',
          matchedContent: node.data?.heading ?? '',
          matchType: 'heading' as const,
          relevance: 1.0,
          highlightRanges: [],
        }));
      }
      return [];
    }

    // 3. Fuzzy match across heading, output, tags
    const searchResults: SearchResult[] = [];
    for (const node of filtered) {
      // Heading match
      const headingMatch = fuzzyMatch(query, node.data?.heading ?? '');
      if (headingMatch.matches) {
        searchResults.push({
          nodeId: node.id,
          workspaceId: node.workspaceId,
          workspaceName: workspaceMap.get(node.workspaceId) ?? '',
          matchedContent: node.data?.heading ?? '',
          matchType: 'heading',
          relevance: headingMatch.score * 1.0,
          highlightRanges: headingMatch.ranges,
        });
      }

      // Output match (only if heading didn't match)
      if (!headingMatch.matches) {
        const outputMatch = fuzzyMatch(query, node.data?.output ?? '');
        if (outputMatch.matches) {
          searchResults.push({ /* ... matchType: 'output', relevance * 0.8 */ });
        }
      }

      // Tag match
      const tagMatch = (node.data?.tags ?? []).find(
        (t) => t.toLowerCase().includes(query.toLowerCase())
      );
      if (tagMatch) {
        searchResults.push({ /* ... matchType: 'tag', relevance: 0.9 */ });
      }
    }

    return searchResults.sort((a, b) => b.relevance - a.relevance);
  }, [query, filters, nodes, edges, workspaceMap]);

  return { query, filters, results, search: setQuery, setFilters, clear };
}
```

### TDD Tests

```
1. Empty query + no filters = no results
2. Empty query + tag filter = all nodes with that tag
3. Query matches heading with fuzzy matching
4. Query matches output with lower relevance
5. Query matches tags
6. Tag filter narrows results
7. Date range filter narrows results
8. Content type filter narrows results
9. Workspace scope filter narrows results
10. Results include highlight ranges
11. Filters compose (tag + date = AND)
12. Results sorted by relevance
```

### Tech Debt Checkpoint

- [ ] useSearch under 75 lines (hook limit)
- [ ] Backward compatible — search(query) still works with no filters
- [ ] No external dependencies for fuzzy
- [ ] Zero lint errors

---

## Sub-phase 8D: Filter Bar UI

### What We Build

A filter bar below the search input with tag chips, date range picker, and content type dropdown.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/components/SearchFilterBar.tsx` | NEW | ~80 |
| `src/features/search/components/SearchFilterBar.module.css` | NEW | ~50 |
| `src/features/search/components/__tests__/SearchFilterBar.test.tsx` | NEW | ~70 |
| `src/features/search/components/SearchBar.tsx` | EDIT | Integrate FilterBar + highlight rendering |
| `src/features/search/strings/searchStrings.ts` | NEW | ~25 |
| `src/shared/localization/strings.ts` | EDIT | Import searchStrings |

### Implementation

**SearchFilterBar**: A horizontal bar that appears when user clicks a filter icon in SearchBar:
- **Tag chips**: Multi-select from existing tags (reads from nodes via `useMemo`)
- **Date range**: Two date inputs (from/to) — native `<input type="date">` for simplicity
- **Content type**: Small dropdown: All, Has Output, Has Attachments, Has Connections, Empty
- **Active filter count**: Badge on filter icon showing number of active filters

**SearchBar changes**:
- Render highlighted match snippets using `splitByRanges` → `<mark>` elements
- Add filter toggle icon button
- Pass filters to `useSearch`

### TDD Tests

```
1. Filter bar renders tag chips, date inputs, content type dropdown
2. Selecting a tag calls setFilters with tag
3. Setting date range calls setFilters with dateRange
4. Content type dropdown updates filter
5. Active filter count badge updates
6. Clear all filters button resets to empty
7. Filter bar toggles on filter icon click
8. All labels from searchStrings
9. Highlight renders <mark> elements for matched ranges
```

### Tech Debt Checkpoint

- [ ] SearchFilterBar under 85 lines
- [ ] CSS uses only variables
- [ ] All strings from searchStrings
- [ ] Native date inputs (no external date picker dependency)
- [ ] Zero lint errors

---

## Sub-phase 8E: "Find Similar" Semantic Search

### What We Build

A "Find Similar" action that uses TF-IDF cosine similarity to discover related nodes. Triggered from the node context menu (Phase 3's context menu) or via a search UI button.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/services/findSimilar.ts` | NEW | ~50 |
| `src/features/search/services/__tests__/findSimilar.test.ts` | NEW | ~70 |
| `src/features/search/hooks/useFindSimilar.ts` | NEW | ~35 |
| `src/features/search/hooks/__tests__/useFindSimilar.test.ts` | NEW | ~50 |
| `src/features/canvas/components/nodes/NodeContextMenu.tsx` | EDIT | Add "Find Similar" menu item |
| `src/shared/localization/contextMenuStrings.ts` | EDIT | Add findSimilar string |

### Implementation

**`findSimilar.ts`** (~50 lines):

```typescript
import { computeTF, buildCorpusIDF, tfidfScore } from '@/features/knowledgeBank/services/tfidfScorer';

export interface SimilarResult {
  nodeId: string;
  similarity: number; // 0-1 cosine similarity
  heading: string;
}

export function findSimilarNodes(
  sourceNodeId: string,
  nodes: CanvasNode[],
  topN: number = 10
): SimilarResult[] {
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  if (!sourceNode) return [];

  const sourceText = getNodeText(sourceNode);
  if (!sourceText.trim()) return [];

  // Build corpus from all nodes
  const corpus = nodes.map((n) => getNodeText(n));
  const idf = buildCorpusIDF(corpus);

  const sourceTF = computeTF(sourceText);
  const sourceVec = tfidfScore(sourceTF, idf);

  // Score every other node
  const results: SimilarResult[] = [];
  for (const node of nodes) {
    if (node.id === sourceNodeId) continue;
    const tf = computeTF(getNodeText(node));
    const vec = tfidfScore(tf, idf);
    const sim = cosineSimilarity(sourceVec, vec);
    if (sim > 0.1) { // threshold
      results.push({
        nodeId: node.id,
        similarity: sim,
        heading: node.data?.heading ?? '',
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

function getNodeText(node: CanvasNode): string {
  return [node.data?.heading, node.data?.output].filter(Boolean).join(' ');
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [term, score] of a) {
    dot += score * (b.get(term) ?? 0);
    magA += score * score;
  }
  for (const [, score] of b) magB += score * score;
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}
```

**Context menu integration**: Add "Find Similar" as a new item in the context menu's "Organize" group. Clicking it opens the search bar pre-populated with similarity results for that node.

### TDD Tests

```
1. findSimilarNodes returns empty for non-existent node
2. findSimilarNodes returns empty for node with no text
3. Similar content nodes score high
4. Dissimilar content nodes score low (< threshold)
5. Results sorted by similarity descending
6. Results capped at topN
7. Source node excluded from results
8. cosineSimilarity returns 1.0 for identical vectors
9. cosineSimilarity returns 0 for orthogonal vectors
10. useFindSimilar hook returns loading state while computing
```

### Tech Debt Checkpoint

- [ ] findSimilar.ts under 55 lines
- [ ] Reuses existing TF-IDF scorer (no duplication)
- [ ] Pure functions for similarity computation
- [ ] Context menu stays under 100 lines after addition
- [ ] Zero lint errors

---

## Sub-phase 8F: Structural Tests

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/search/__tests__/advancedSearch.structural.test.ts` | NEW | ~35 |

### Structural Tests

```
1. useSearch accepts SearchFilters parameter
2. SearchResult includes highlightRanges field
3. fuzzyMatch is a pure function (no imports of stores/hooks)
4. searchFilters is a pure function (no side effects)
5. findSimilar imports from tfidfScorer (reuse, not duplication)
6. No hardcoded strings in search components (grep scan)
7. SearchFilterBar uses CSS variables only
```

---

## Phase 8 Summary

### Execution Order

| Phase | What | Why This Order |
|-------|------|----------------|
| 8A | Filter types + predicates | Foundation — pure functions |
| 8B | Fuzzy match + highlight | Used by enhanced useSearch |
| 8C | Enhanced useSearch hook | Composes 8A + 8B |
| 8D | Filter bar UI | Consumes 8C hook |
| 8E | Find Similar (TF-IDF) | Independent feature, reuses KB scorer |
| 8F | Structural tests | Validates final state |

### Net Impact

- **Files created**: ~17 (services, hooks, components, CSS, tests)
- **Files edited**: 5 (search.ts types, useSearch, SearchBar, NodeContextMenu, strings)
- **Net line count change**: ~+800 lines
- **User impact**: Tag filtering, fuzzy search, date range, "Find Similar" — search actually works at scale
- **Performance**: Client-side, <50ms for 1000 nodes. TF-IDF computed on-demand (not on every keystroke — debounced for "Find Similar")
