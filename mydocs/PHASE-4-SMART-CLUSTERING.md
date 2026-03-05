# Phase 4: Smart Clustering & Canvas Overview

## Problem Statement

As canvases grow beyond 20-30 nodes, users lose the "peripheral vision" advantage that makes canvas thinking superior to flatbed tools. Everything looks like a flat scatter of cards with no visible themes or structure. Spatial proximity is accidental — wherever the user dropped the node — rather than semantic. The minimap shows positions but not meaning. Users cannot answer "what are the main themes in my research?" or "where are the gaps?" at a glance. At low zoom levels, nodes become tiny unreadable rectangles.

## Intended Solution

Two complementary features:

1. **AI-powered clustering**: Users click "Cluster" and the AI groups nodes by content similarity, draws visual boundaries around groups, and labels each cluster. Users can accept (auto-arrange into clusters) or dismiss.

2. **Semantic zoom**: At low zoom levels, nodes progressively simplify — first showing only headings, then collapsing to colored dots with cluster labels prominent. This makes the macro structure visible without squinting at tiny text.

## Architecture Decision

- **New feature module**: `src/features/clustering/` (services + components)
- **TF-IDF reuse**: Leverages existing `nodePoolBuilder.ts` TF-IDF infrastructure
- **Cluster state**: Stored on workspace level in Zustand (`useCanvasStore`) as `clusterGroups: ClusterGroup[]`
- **Persisted**: Cluster groups saved to Firestore alongside nodes/edges
- **Semantic zoom**: Implemented in `IdeaCard` via viewport zoom subscription (existing ReactFlow `useStore` pattern)
- **No new Zustand store**: Clusters are canvas state (they describe spatial organization of nodes)
- **Security**: AI labeling uses the same Gemini pipeline (sanitized, gated)

---

## Sub-phase 4A: Content Similarity Scoring

### What We Build

A service that computes pairwise content similarity between nodes using TF-IDF vectors, then groups similar nodes into clusters.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/clustering/services/similarityService.ts` | NEW | ~70 |
| `src/features/clustering/services/__tests__/similarityService.test.ts` | NEW | ~120 |
| `src/features/clustering/types/cluster.ts` | NEW | ~30 |

### Implementation

**`cluster.ts`** — types:

```typescript
export interface ClusterGroup {
  readonly id: string;                    // unique cluster ID
  readonly nodeIds: readonly string[];    // nodes in this cluster
  readonly label: string;                 // AI-generated or default label
  readonly color: string;                 // CSS variable name, e.g. '--cluster-color-1'
  readonly boundingBox: ClusterBounds;    // computed from node positions
}

export interface ClusterBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SimilarityResult {
  readonly clusters: readonly ClusterGroup[];
  readonly unclustered: readonly string[];  // nodes that didn't fit any cluster
}
```

**`similarityService.ts`**:

```typescript
export function computeClusters(
  nodes: readonly CanvasNode[],
  minClusterSize: number = 2,
  similarityThreshold: number = 0.15
): SimilarityResult
```

**Algorithm**:
1. Extract text per node: `heading + ' ' + output` (plain text, no HTML)
2. Build TF-IDF vectors using existing `computeTfIdf` from `nodePoolBuilder.ts` (refactored to a shared utility if needed)
3. Compute cosine similarity matrix (pairwise)
4. Agglomerative clustering:
   - Start: each node is its own cluster
   - Merge: repeatedly merge the two most similar clusters (average linkage)
   - Stop: when max inter-cluster similarity drops below `similarityThreshold`
   - Filter: remove clusters smaller than `minClusterSize`
5. Assign colors from a rotating palette of CSS variable names (`--cluster-color-1` through `--cluster-color-8`)
6. Compute bounding box per cluster from node positions + padding (40px)
7. Default labels: `Cluster 1`, `Cluster 2`, etc. (AI labeling happens separately in 4B)

**Security**: Pure computation on in-memory node data. No external calls. No user input used as code.

### TDD Tests

```
1. 2 similar nodes → grouped in 1 cluster
2. 2 dissimilar nodes → 2 separate clusters (or unclustered)
3. 5 nodes, 3 similar + 2 similar → 2 clusters
4. Single node → unclustered (below minClusterSize)
5. All identical content → 1 cluster containing all
6. All completely different → all unclustered
7. Empty nodes (no heading/output) → excluded from clustering
8. Bounding box correctly encloses all node positions + padding
9. Colors rotate through palette (no two adjacent clusters same color)
10. 50 nodes → completes in < 100ms (performance test)
11. Threshold 0 → every node in its own cluster
12. Threshold 1 → all nodes in one cluster
```

### Tech Debt Checkpoint

- [ ] File under 300 lines
- [ ] Reuses TF-IDF infrastructure (DRY — no reimplementation)
- [ ] Pure function — no side effects
- [ ] No `any` types
- [ ] Zero lint errors

---

## Sub-phase 4B: AI Cluster Labeling

### What We Build

A service that sends cluster node summaries to Gemini and receives short descriptive labels.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/clustering/services/clusterLabelService.ts` | NEW | ~45 |
| `src/features/clustering/services/__tests__/clusterLabelService.test.ts` | NEW | ~60 |
| `src/shared/localization/clusterStrings.ts` | NEW | ~30 |
| `src/shared/localization/strings.ts` | EDIT | +2 lines |

### Implementation

**`clusterStrings.ts`**:

```typescript
export const clusterStrings = {
  labels: {
    cluster: 'Cluster',
    suggestClusters: 'Suggest clusters',
    accept: 'Accept',
    dismiss: 'Dismiss',
    recluster: 'Re-cluster',
    clearClusters: 'Clear clusters',
    clustering: 'Analyzing themes...',
    noThemes: 'No clear themes detected',
    unclustered: 'Unclustered',
  },
  prompts: {
    labelInstruction: 'Given the following group of related ideas, provide a short label (2-4 words) that describes their common theme. Return ONLY the label text, nothing else.',
    ideaPrefix: 'Idea',
  },
} as const;
```

**`clusterLabelService.ts`**:

```typescript
export async function labelClusters(
  clusters: readonly ClusterGroup[],
  nodes: readonly CanvasNode[]
): Promise<readonly ClusterGroup[]>
```

**Flow**:
1. For each cluster, collect node headings (first 5 nodes max — budget control)
2. Build prompt: `labelInstruction` + listed headings
3. Call Gemini (lightweight call — short response expected)
4. Parse response: trim whitespace, take first line, clamp to 40 chars
5. Return clusters with updated `label` fields
6. On error per cluster: keep default label (`Cluster N`), log warning, continue

**Parallelization**: All cluster labeling calls fire in parallel via `Promise.allSettled()`. Each is independent.

**Security**: Node headings placed in clearly delimited prompt blocks. Response clamped to 40 chars (prevents injection of long content). No HTML in labels.

### TDD Tests

```
1. Single cluster → Gemini called with headings → label updated
2. 3 clusters → 3 parallel Gemini calls
3. Gemini error for 1 cluster → that cluster keeps default label, others labeled
4. Response > 40 chars → truncated
5. Response with multiple lines → only first line used
6. Empty cluster → skipped (no Gemini call)
7. All prompts use clusterStrings constants
```

### Tech Debt Checkpoint

- [ ] File under 300 lines
- [ ] All strings from `clusterStrings`
- [ ] Response sanitized (length clamped, trimmed)
- [ ] Graceful degradation per cluster
- [ ] Zero lint errors

---

## Sub-phase 4C: Canvas Store Extension for Clusters

### What We Build

Add `clusterGroups` state and actions to `useCanvasStore`.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/stores/canvasStore.ts` | EDIT | +15 lines |
| `src/features/clustering/types/cluster.ts` | Already created in 4A |
| `src/features/canvas/stores/__tests__/canvasStore.cluster.test.ts` | NEW | ~60 |

### Implementation

**New state field**:
```typescript
clusterGroups: ClusterGroup[]  // default: []
```

**New actions**:
```typescript
setClusterGroups: (groups: ClusterGroup[]) => void
clearClusterGroups: () => void
updateClusterBounds: () => void  // recalculates bounding boxes from current node positions
```

**`setClusterGroups`**: Single `setState` call — atomic update, no cascading.

**`updateClusterBounds`**: Called after node drag ends (not during — performance). Reads current node positions, recomputes `boundingBox` for each cluster. Uses `getState()` internally — no selector closure risk.

**Integration with existing persistence**: `clusterGroups` serialized alongside nodes/edges in Firestore. Added to the workspace save/load cycle.

**Zustand safety**:
- `clusterGroups` accessed via selector: `useCanvasStore((s) => s.clusterGroups)`
- `setClusterGroups` called via `getState()`
- `updateClusterBounds` hooked to ReactFlow's `onNodeDragStop` (existing handler in `useCanvasHandlers.ts`)
- No intermediate state — single atomic update

### TDD Tests

```
1. setClusterGroups replaces cluster state atomically
2. clearClusterGroups resets to []
3. updateClusterBounds recalculates from current node positions
4. Cluster state survives node deletion (orphaned nodeIds filtered out)
5. Initial state has empty clusterGroups
```

### Tech Debt Checkpoint

- [ ] canvasStore stays under 300 lines (currently 282 + 15 = 297 — tight but OK)
- [ ] If over 300: extract cluster slice to `clices/clusterSlice.ts` and merge
- [ ] Single setState per action
- [ ] No closure variables
- [ ] Zero lint errors

---

## Sub-phase 4D: Cluster Boundary Renderer

### What We Build

A React component that draws translucent colored rectangles behind clustered nodes, with labels.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/clustering/components/ClusterBoundary.tsx` | NEW | ~55 |
| `src/features/clustering/components/ClusterBoundary.module.css` | NEW | ~40 |
| `src/features/clustering/components/__tests__/ClusterBoundary.test.tsx` | NEW | ~70 |
| `src/features/canvas/components/CanvasView.tsx` | EDIT | +5 lines (render ClusterBoundaries) |
| `src/styles/variables.css` | EDIT | +10 lines (cluster color palette) |

### Implementation

**`variables.css`** — cluster color palette:
```css
--cluster-color-1: oklch(0.85 0.12 200);  /* cyan-blue */
--cluster-color-2: oklch(0.85 0.12 140);  /* green */
--cluster-color-3: oklch(0.85 0.12 320);  /* purple */
--cluster-color-4: oklch(0.85 0.12 60);   /* amber */
--cluster-color-5: oklch(0.85 0.12 20);   /* coral */
--cluster-color-6: oklch(0.85 0.12 260);  /* indigo */
--cluster-color-7: oklch(0.85 0.12 100);  /* lime */
--cluster-color-8: oklch(0.85 0.12 350);  /* pink */
--cluster-opacity: 0.08;
--cluster-border-opacity: 0.25;
--cluster-label-opacity: 0.7;
```

**`ClusterBoundary.tsx`**:

```typescript
interface ClusterBoundaryProps {
  readonly cluster: ClusterGroup;
}

export const ClusterBoundary = React.memo(function ClusterBoundary({
  cluster
}: ClusterBoundaryProps) {
  // Positioned absolutely within ReactFlow's viewport layer
  // ReactFlow transforms handle zoom/pan automatically
  const { x, y, width, height } = cluster.boundingBox;

  return (
    <div
      className={styles.boundary}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: `var(${cluster.color})`,
      }}
      role="group"
      aria-label={cluster.label}
    >
      <span className={styles.label}>{cluster.label}</span>
    </div>
  );
});
```

**CSS**:
- `.boundary`: `position: absolute`, `opacity: var(--cluster-opacity)`, `border-radius: var(--radius-xl)`, `border: 2px solid` with `opacity: var(--cluster-border-opacity)`, `pointer-events: none` (click-through to nodes)
- `.label`: `position: absolute`, `top: calc(-1 * var(--space-lg))`, `left: var(--space-sm)`, `font-size: var(--font-size-sm)`, `color: var(--color-text-secondary)`, `opacity: var(--cluster-label-opacity)`

**CanvasView.tsx** — render cluster boundaries below nodes:
```typescript
// Inside the ReactFlow component, as a background layer
const clusterGroups = useCanvasStore((s) => s.clusterGroups);
// ... render ClusterBoundary for each group
```

**Performance**: `React.memo` on each boundary. Boundaries only re-render when their specific cluster's bounds change. `pointer-events: none` ensures no interference with node interactions.

### TDD Tests

```
1. Renders boundary at correct position and size
2. Label text matches cluster.label
3. Background color uses cluster.color CSS variable
4. pointer-events: none (no click interference)
5. React.memo prevents unnecessary re-renders
6. aria-label set for accessibility
7. No boundaries rendered when clusterGroups is empty
8. Multiple clusters render independently
```

### Tech Debt Checkpoint

- [ ] Component under 100 lines
- [ ] All CSS uses variables
- [ ] React.memo applied
- [ ] No Zustand anti-patterns (single selector for clusterGroups)
- [ ] Zero lint errors

---

## Sub-phase 4E: Cluster Suggestion UI

### What We Build

A "Cluster" button in workspace controls that triggers clustering, shows a preview, and lets users accept or dismiss.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/clustering/hooks/useClusterSuggestion.ts` | NEW | ~70 |
| `src/features/clustering/hooks/__tests__/useClusterSuggestion.test.ts` | NEW | ~100 |
| `src/features/clustering/components/ClusterPreviewBar.tsx` | NEW | ~45 |
| `src/features/clustering/components/ClusterPreviewBar.module.css` | NEW | ~30 |
| `src/features/clustering/components/__tests__/ClusterPreviewBar.test.tsx` | NEW | ~60 |
| `src/features/workspace/components/WorkspaceControls.tsx` | EDIT | +8 lines |

### Implementation

**`useClusterSuggestion.ts`**:

```typescript
interface UseClusterSuggestionReturn {
  readonly suggestClusters: () => Promise<void>;
  readonly acceptClusters: () => void;
  readonly dismissClusters: () => void;
  readonly isClustering: boolean;
  readonly previewGroups: readonly ClusterGroup[] | null;  // null = no preview
}

export function useClusterSuggestion(): UseClusterSuggestionReturn
```

**Flow**:
1. `suggestClusters()`:
   - Read nodes from `getState()` (fresh, no closure)
   - Call `computeClusters(nodes)`
   - Call `labelClusters(clusters, nodes)` (AI labeling)
   - Set `previewGroups` in local `useReducer` state
   - Render preview boundaries with dashed borders (visual distinction from accepted)
2. `acceptClusters()`:
   - Call `useCanvasStore.getState().setClusterGroups(previewGroups)`
   - Optionally auto-arrange nodes into cluster formations
   - Clear preview state
3. `dismissClusters()`:
   - Clear preview state (no store mutation)

**Zustand safety**: All store reads inside callbacks use `getState()`. Preview state is local `useReducer` — completely isolated from canvas store.

**`ClusterPreviewBar.tsx`** — floating notification bar:
```typescript
// Shows: "Found 3 themes  [Accept] [Dismiss]"
// Positioned at bottom of canvas, above zoom controls
```

**WorkspaceControls.tsx** — add cluster button:
```typescript
<button onClick={suggestClusters} disabled={isClustering}
  aria-label={clusterStrings.labels.suggestClusters}>
  <ClusterIcon size={20} />
</button>
```

### TDD Tests

**useClusterSuggestion.test.ts**:
```
1. suggestClusters calls computeClusters with current nodes
2. suggestClusters calls labelClusters for AI labels
3. Preview groups set after successful clustering
4. acceptClusters commits to canvas store (single setState)
5. dismissClusters clears preview without store mutation
6. isClustering = true during processing
7. Error → preview stays null, toast shown
8. No stale closures (uses getState() inside callbacks)
```

**ClusterPreviewBar.test.tsx**:
```
1. Renders cluster count text
2. Accept button calls acceptClusters
3. Dismiss button calls dismissClusters
4. Not rendered when previewGroups is null
5. All labels from clusterStrings
```

### Tech Debt Checkpoint

- [ ] Hook under 75 lines
- [ ] Component under 100 lines
- [ ] Local useReducer for preview state
- [ ] All strings from clusterStrings
- [ ] WorkspaceControls stays under 100 lines
- [ ] Zero lint errors

---

## Sub-phase 4F: Semantic Zoom

### What We Build

Progressive node simplification at low zoom levels.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/hooks/useSemanticZoom.ts` | NEW | ~30 |
| `src/features/canvas/components/nodes/IdeaCard.tsx` | EDIT | +8 lines |
| `src/features/canvas/components/nodes/IdeaCard.module.css` | EDIT | +15 lines |
| `src/features/canvas/hooks/__tests__/useSemanticZoom.test.ts` | NEW | ~40 |
| `src/styles/variables.css` | EDIT | +3 lines |

### Implementation

**`useSemanticZoom.ts`**:

```typescript
export type ZoomLevel = 'full' | 'heading' | 'dot';

export function useSemanticZoom(): ZoomLevel {
  // Read zoom from ReactFlow's internal store — this is the sanctioned pattern
  const zoom = useStore((s) => s.transform[2]);  // ReactFlow useStore, NOT Zustand

  if (zoom >= 0.5) return 'full';
  if (zoom >= 0.25) return 'heading';
  return 'dot';
}
```

**`variables.css`**:
```css
--semantic-zoom-heading-threshold: 0.5;
--semantic-zoom-dot-threshold: 0.25;
--semantic-zoom-dot-size: 24px;
```

**IdeaCard.tsx** — conditional rendering:
```typescript
const zoomLevel = useSemanticZoom();

// In render:
{zoomLevel === 'dot' ? (
  <div className={styles.dotView} style={{ backgroundColor: nodeColorVar }} />
) : (
  <>
    <IdeaCardHeadingSection ... />
    {zoomLevel === 'full' && <IdeaCardContentSection ... />}
  </>
)}
```

**CSS**:
- `.dotView`: `width: var(--semantic-zoom-dot-size)`, `height: var(--semantic-zoom-dot-size)`, `border-radius: var(--radius-full)`, no border, just colored dot
- `.headingOnly`: heading text uses `var(--font-size-sm)`, no padding, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`

**Performance**: `useStore` from ReactFlow is already optimized — the selector `(s) => s.transform[2]` only triggers re-render when zoom changes. The conditional rendering eliminates heavy TipTap editors at low zoom, dramatically improving performance with 100+ nodes.

### TDD Tests

```
1. zoom >= 0.5 → returns 'full'
2. zoom 0.3 → returns 'heading'
3. zoom 0.2 → returns 'dot'
4. zoom exactly 0.5 → 'full' (boundary)
5. zoom exactly 0.25 → 'heading' (boundary)
6. IdeaCard at 'full' zoom → renders heading + content
7. IdeaCard at 'heading' zoom → renders heading only
8. IdeaCard at 'dot' zoom → renders colored dot
```

### Tech Debt Checkpoint

- [ ] Hook under 75 lines (target: ~30)
- [ ] IdeaCard stays under 100 lines
- [ ] CSS uses variables
- [ ] No Zustand involvement (uses ReactFlow's useStore)
- [ ] Zero lint errors

---

## Sub-phase 4G: Structural & Integration Tests

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/clustering/__tests__/clustering.structural.test.ts` | NEW | ~50 |
| `src/features/clustering/__tests__/clustering.integration.test.ts` | NEW | ~90 |

### Structural Tests

```
1. All clustering files under 300 lines
2. No hardcoded strings in components (grep scan)
3. No any types in clustering feature
4. ClusterBoundary uses React.memo
5. No Zustand anti-patterns
6. Cluster color variables defined in variables.css
```

### Integration Test

```
1. Full flow: 10 nodes with 2 themes → computeClusters → 2 groups → label → accept → boundaries visible
2. Accept + drag node → updateClusterBounds recalculates
3. Clear clusters → boundaries removed
4. Semantic zoom at 0.3 → nodes show headings only → cluster labels prominent
5. Cluster with nodes deleted → cluster filtered on next updateBounds
```

### Build Gate Checklist (Full Phase 4)

```bash
npx tsc --noEmit          # zero errors
npm run lint               # zero errors
npm run test               # ALL pass
find src/features/clustering -name "*.ts*" | xargs wc -l | awk '$1 > 300'  # empty
```

---

## Phase 4 Tech Debt Audit

| Potential Debt | How We Prevented It |
|---------------|-------------------|
| Duplicate TF-IDF logic | Shared utility extracted from nodePoolBuilder (DRY) |
| Cluster state cascade | Single `setClusterGroups` atomic update; preview in local reducer |
| Stale bounding boxes after drag | `updateClusterBounds` on `onNodeDragStop` (not during drag) |
| Large canvasStore | Monitor line count — extract to cluster slice if approaching 300 |
| Hardcoded colors | 8-color palette as CSS variables, referenced by name in cluster objects |
| Performance at 100+ nodes | Semantic zoom eliminates TipTap rendering at low zoom; clustering is O(n²) but runs once on-demand |
| Zustand anti-patterns | All callbacks use getState(); preview state isolated in useReducer |
| Security | AI labeling response clamped to 40 chars; no HTML in labels |
| Orphaned clusters | Clusters filtered on bound update — stale nodeIds removed |

**Net new files**: 18 (10 source + 8 test)
**Files modified**: 5 (canvasStore, CanvasView, IdeaCard, WorkspaceControls, variables.css, strings.ts)
**Estimated total new lines**: ~1,400 (source + tests)
