# Phase 9: Workspace Templates & Quick Start — No Blank Canvas Anxiety

## Problem Statement

Every new workspace starts as an empty canvas. For new users, this is intimidating — they have a powerful tool but no idea where to begin. For experienced users, it's repetitive — they recreate the same thinking structures (project plan, research canvas, brainstorm board) every time. BASB's CODE methodology (Capture, Organize, Distill, Express) provides a natural framework, but the app doesn't guide users toward it. A template system solves both problems: new users get a starting point that teaches the workflow, and experienced users skip setup.

## Intended Solution

A **template picker** that appears when creating a new workspace. Users choose from 4-5 built-in templates or "Blank canvas." Each template pre-populates 3-8 connected nodes with placeholder text that demonstrates a thinking pattern. Templates are **client-side only** — defined as JSON structures, no server storage needed. Users can also **save a workspace as a template** for personal reuse.

## Architecture Decisions

- **New feature module**: `src/features/templates/` (types, services, components)
- **No new Zustand store** — template picker is a modal with local state
- **Templates are static JSON** — defined in `templateDefinitions.ts`, each template is an array of `CanvasNode` + `CanvasEdge` objects with relative positions
- **ID generation**: Template nodes use placeholder IDs (`template-1`, `template-2`). On instantiation, all IDs are replaced with `crypto.randomUUID()` and edge source/target references are remapped.
- **Custom templates**: Saved to `localStorage` as serialized workspace snapshots. Limited to 10 custom templates (prevent unbounded storage).
- **No Firestore for templates** — templates are a client-side feature. If multi-device sync is needed later, it can be added as a Firestore subcollection.
- **Template picker UI**: Modal triggered from workspace creation flow. Shows template cards with title, description, and node count preview.
- **Analytics**: Add `'template_used'` to `SettingKey` union in `analyticsService.ts`.

---

## Sub-phase 9A: Template Types & Definitions

### What We Build

Type definitions and 5 built-in template structures.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/templates/types/template.ts` | NEW | ~30 |
| `src/features/templates/services/templateDefinitions.ts` | NEW | ~90 |
| `src/features/templates/services/__tests__/templateDefinitions.test.ts` | NEW | ~50 |
| `src/features/templates/strings/templateStrings.ts` | NEW | ~40 |

### Implementation

**`template.ts`** (~30 lines):

```typescript
export interface WorkspaceTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TemplateCategory;
  readonly nodes: TemplateNode[];
  readonly edges: TemplateEdge[];
  readonly isCustom: boolean;
}

export type TemplateCategory = 'basb' | 'project' | 'creative' | 'research' | 'custom';

export interface TemplateNode {
  readonly templateId: string;    // placeholder ID (remapped on instantiation)
  readonly heading: string;
  readonly output: string;
  readonly position: { x: number; y: number };
  readonly colorKey: NodeColorKey;
}

export interface TemplateEdge {
  readonly sourceTemplateId: string;
  readonly targetTemplateId: string;
}

export const MAX_CUSTOM_TEMPLATES = 10;
export const CUSTOM_TEMPLATES_STORAGE_KEY = 'custom_templates';
```

**Built-in templates** (5 templates in `templateDefinitions.ts`):

| Template | Nodes | Structure | Purpose |
|----------|-------|-----------|---------|
| **BASB CODE Flow** | 4 | Linear chain: Capture → Organize → Distill → Express | Teaches the BASB methodology |
| **Project Kickoff** | 5 | Hub: "Project Goal" center → Scope, Timeline, Risks, Resources | Standard project planning |
| **Research Canvas** | 6 | Tree: "Research Question" → 3 sub-questions → 2 sources per | Academic/deep research |
| **Brainstorm** | 8 | Flat cluster: 8 empty idea cards in a grid, no connections | Divergent thinking |
| **Weekly Review** | 4 | Linear: "What happened" → "What I learned" → "What's next" → "Actions" | BASB periodic review |

Each template node has placeholder heading text from `templateStrings.ts` (e.g., `strings.templates.basb.captureHeading = "Capture — What resonated with me?"`).

### TDD Tests

```
1. Each built-in template has unique id
2. Each template has at least 2 nodes
3. All edge source/target reference valid template node IDs
4. All headings are non-empty strings
5. All positions are valid {x, y} objects
6. Template categories are valid TemplateCategory values
7. No duplicate template IDs
```

### Tech Debt Checkpoint

- [ ] template.ts under 35 lines
- [ ] templateDefinitions.ts under 95 lines
- [ ] All heading/description text from templateStrings.ts
- [ ] Zero lint errors

---

## Sub-phase 9B: Template Instantiation Service

### What We Build

A pure function that takes a template definition and produces real `CanvasNode[]` + `CanvasEdge[]` with proper UUIDs and absolute positions.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/templates/services/templateInstantiator.ts` | NEW | ~45 |
| `src/features/templates/services/__tests__/templateInstantiator.test.ts` | NEW | ~70 |

### Implementation

**`templateInstantiator.ts`** (~45 lines):

```typescript
import type { WorkspaceTemplate } from '../types/template';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@/features/canvas/types/node';

export interface InstantiatedTemplate {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export function instantiateTemplate(
  template: WorkspaceTemplate,
  workspaceId: string
): InstantiatedTemplate {
  // Remap placeholder IDs → real UUIDs
  const idMap = new Map<string, string>();
  for (const tNode of template.nodes) {
    idMap.set(tNode.templateId, `idea-${crypto.randomUUID()}`);
  }

  const now = new Date();
  const nodes: CanvasNode[] = template.nodes.map((tNode) => ({
    id: idMap.get(tNode.templateId)!,
    type: 'idea' as const,
    position: tNode.position,
    workspaceId,
    createdAt: now,
    updatedAt: now,
    data: {
      heading: tNode.heading,
      output: tNode.output,
      tags: [],
      colorKey: tNode.colorKey,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    },
  }));

  const edges: CanvasEdge[] = template.edges.map((tEdge) => ({
    id: `edge-${crypto.randomUUID()}`,
    source: idMap.get(tEdge.sourceTemplateId)!,
    target: idMap.get(tEdge.targetTemplateId)!,
  }));

  return { nodes, edges };
}
```

### TDD Tests

```
1. All template IDs replaced with crypto.randomUUID() format
2. Edge source/target reference new node IDs (not template IDs)
3. All nodes have workspaceId set
4. All nodes have createdAt/updatedAt set
5. Node positions match template positions
6. Headings and outputs copied from template
7. No template placeholder IDs remain in output
8. Empty template produces empty arrays
9. Edges count matches template edges count
10. Each instantiation produces unique IDs (no reuse)
```

### Tech Debt Checkpoint

- [ ] templateInstantiator.ts under 50 lines
- [ ] Pure function (no side effects, no store access)
- [ ] crypto.randomUUID() for all IDs
- [ ] Zero lint errors

---

## Sub-phase 9C: Template Picker Modal

### What We Build

A modal that appears during workspace creation, showing template cards to choose from.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/templates/components/TemplatePicker.tsx` | NEW | ~85 |
| `src/features/templates/components/TemplatePicker.module.css` | NEW | ~60 |
| `src/features/templates/components/TemplateCard.tsx` | NEW | ~40 |
| `src/features/templates/components/TemplateCard.module.css` | NEW | ~30 |
| `src/features/templates/components/__tests__/TemplatePicker.test.tsx` | NEW | ~70 |
| `src/features/templates/index.ts` | NEW | ~5 |
| `src/features/workspace/components/WorkspaceControls.tsx` | EDIT | Wire template picker into "New Workspace" flow |

### Implementation

**TemplatePicker modal**:
- Shows 5 built-in template cards + custom templates + "Blank Canvas" option
- Each card shows: name, description, node count, mini topology preview (dots + lines)
- Clicking a card calls `onSelect(template)` → instantiates → populates workspace
- "Blank Canvas" skips instantiation (existing behavior)

**TemplateCard** (~40 lines):
- Compact card with title, description, node count badge
- Mini preview: renders template node positions as small dots with connecting lines in a 100x60 SVG
- Selected state with accent border

**WorkspaceControls integration**:
- "New Workspace" button opens TemplatePicker modal instead of immediately creating an empty workspace
- After selection, creates workspace + instantiates template nodes/edges + switches to it

### TDD Tests

```
1. Renders all 5 built-in templates + Blank Canvas
2. Each card shows name and description
3. Clicking a template card calls onSelect
4. Clicking "Blank Canvas" calls onSelect(null)
5. Modal closes on Escape
6. Modal closes on backdrop click
7. Custom templates appear when available
8. All text from templateStrings
9. role="dialog" present
10. Template cards show node count
```

### Tech Debt Checkpoint

- [ ] TemplatePicker under 90 lines
- [ ] TemplateCard under 45 lines
- [ ] CSS uses only variables
- [ ] Portal rendering for modal
- [ ] Accessible (role, Escape, focus trap)
- [ ] Zero lint errors

---

## Sub-phase 9D: Save as Template

### What We Build

Let users save their current workspace as a custom template for reuse.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/templates/services/customTemplateService.ts` | NEW | ~50 |
| `src/features/templates/services/__tests__/customTemplateService.test.ts` | NEW | ~60 |
| `src/features/workspace/components/WorkspaceControls.tsx` | EDIT | Add "Save as Template" option |

### Implementation

**`customTemplateService.ts`** (~50 lines):

```typescript
export function saveAsTemplate(
  name: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): WorkspaceTemplate {
  const existing = getCustomTemplates();
  if (existing.length >= MAX_CUSTOM_TEMPLATES) {
    throw new Error(templateStrings.errors.maxTemplatesReached);
  }

  // Normalize positions relative to top-left origin
  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));

  const template: WorkspaceTemplate = {
    id: `custom-${crypto.randomUUID()}`,
    name,
    description: templateStrings.customDescription,
    category: 'custom',
    isCustom: true,
    nodes: nodes.map((n) => ({
      templateId: n.id,
      heading: n.data?.heading ?? '',
      output: n.data?.output ?? '',
      position: { x: n.position.x - minX, y: n.position.y - minY },
      colorKey: n.data?.colorKey ?? 'default',
    })),
    edges: edges.map((e) => ({
      sourceTemplateId: e.source,
      targetTemplateId: e.target,
    })),
  };

  const updated = [...existing, template];
  localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
  return template;
}

export function getCustomTemplates(): WorkspaceTemplate[] {
  const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); }
  catch { return []; }
}

export function deleteCustomTemplate(templateId: string): void {
  const templates = getCustomTemplates().filter((t) => t.id !== templateId);
  localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}
```

### TDD Tests

```
1. saveAsTemplate stores to localStorage
2. Positions normalized relative to top-left
3. Throws when MAX_CUSTOM_TEMPLATES exceeded
4. getCustomTemplates returns empty array for no data
5. getCustomTemplates handles corrupted JSON gracefully
6. deleteCustomTemplate removes by ID
7. Template ID uses crypto.randomUUID()
8. Custom template has isCustom = true
9. Headings and outputs captured from nodes
10. Edge references use original node IDs as template IDs
```

### Tech Debt Checkpoint

- [ ] customTemplateService under 55 lines
- [ ] localStorage only (no Firestore)
- [ ] Graceful error handling for corrupted data
- [ ] crypto.randomUUID() for template IDs
- [ ] Zero lint errors

---

## Phase 9 Summary

### Execution Order

| Phase | What | Why This Order |
|-------|------|----------------|
| 9A | Types + definitions + strings | Foundation — define templates |
| 9B | Instantiation service | Pure function, tested in isolation |
| 9C | Template picker modal | Consumes 9A + 9B |
| 9D | Save as template | Independent feature, adds to 9A definitions |

### Net Impact

- **Files created**: ~18 (types, services, components, CSS, strings, tests)
- **Files edited**: 2 (WorkspaceControls, strings.ts)
- **Net line count change**: ~+750 lines
- **User impact**: New workspaces start with structure, not emptiness. Custom templates enable personal workflow reuse.
- **New user impact**: "BASB CODE Flow" template immediately teaches Capture → Organize → Distill → Express

### Built-in Template Details

| Template | Nodes | Edges | Color | Teaching Goal |
|----------|-------|-------|-------|---------------|
| BASB CODE Flow | 4 | 3 (linear chain) | success | The core BASB methodology |
| Project Kickoff | 5 | 4 (hub-and-spoke) | warning | Structured planning |
| Research Canvas | 6 | 5 (tree) | default | Deep inquiry structure |
| Brainstorm | 8 | 0 (no connections) | default | Divergent thinking (connect later) |
| Weekly Review | 4 | 3 (linear chain) | synthesis | Periodic reflection habit |

### What's NOT Included

| Item | Reason |
|------|--------|
| Server-synced templates | Over-engineering — localStorage sufficient for personal use |
| Template marketplace/sharing | Future feature if demand exists |
| Template versioning | Not needed for static definitions |
| AI-generated templates | Interesting but adds AI dependency to a static feature |
| Template categories/filtering | 5 templates doesn't need filtering UI |
