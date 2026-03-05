# Phase 3: Simplify the Node UX

## Problem Statement

The IdeaCard has accumulated 14 action IDs across 2 customizable decks (`ai`, `connect`, `copy`, `pin`, `delete`, `tags`, `image`, `attachment`, `duplicate`, `focus`, `collapse`, `color`, `share`, `pool`), plus a drag-to-reorder toolbar customization system in Settings. For new users, this is a wall of icons that obscures the canvas-first thinking experience. The dual-deck system with drag-and-drop reordering is over-engineered — it solves a configuration problem that most users never have. The proximity hover already helps, but the sheer volume of actions when the bar expands dilutes the core experience.

Meanwhile, Phase 1 added `synthesize` and Phase 2 added `export` — bringing the total to 16 action IDs. This is unsustainable.

## Intended Solution

Reduce the primary NodeUtilsBar to **6 essential actions** in a single flat bar (no decks). Move all secondary actions into a right-click context menu that doubles as a "More..." overflow menu. Remove the dual-deck toolbar customization system from Settings entirely. The node should feel lightweight — a card you think with, not a control panel you configure.

## Architecture Decision

- **No new Zustand store** — menu open/close state is local `useState`
- **Remove code** — dual-deck system, toolbar drag, DeckColumn, Toolbar Settings section
- **Context menu** — reuses the `PortalTooltip` positioning logic, renders in portal
- **Backward compatibility** — old `utilsBarLayout` in localStorage auto-migrates to new flat array format
- **No breaking changes to node data** — IdeaNodeData shape unchanged

---

## Sub-phase 3A: Define the Essential Action Set & Update Types

### What We Build

Formalize the new 6-action primary bar and the secondary action list. Update type definitions.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/types/utilsBarLayout.ts` | REWRITE | ~40 (down from 102) |
| `src/features/canvas/types/__tests__/utilsBarLayout.test.ts` | EDIT | update validation tests |

### Implementation

**New `utilsBarLayout.ts`**:

```typescript
// Primary bar — fixed set, non-configurable
export const PRIMARY_ACTIONS = [
  'ai', 'connect', 'synthesize', 'copy', 'export', 'delete'
] as const;
export type PrimaryActionId = typeof PRIMARY_ACTIONS[number];

// Context menu — all secondary actions
export const CONTEXT_MENU_ACTIONS = [
  'tags', 'color', 'pin', 'collapse', 'focus', 'duplicate',
  'image', 'attachment', 'share', 'pool'
] as const;
export type ContextMenuActionId = typeof CONTEXT_MENU_ACTIONS[number];

export type UtilsBarActionId = PrimaryActionId | ContextMenuActionId;

// Context menu groups for visual organization
export const CONTEXT_MENU_GROUPS = {
  edit: ['tags', 'color'] as const,
  view: ['collapse', 'focus'] as const,
  organize: ['pin', 'duplicate', 'share', 'pool'] as const,
  insert: ['image', 'attachment'] as const,
} as const;
```

**Migration**: The `useSettingsStore` `loadFromStorage` already validates layout format. The new validation will reject any old `{ deck1, deck2 }` format and fall back to the new defaults. No explicit migration needed — the existing rejection + fallback pattern handles it.

### TDD Tests

```
1. PRIMARY_ACTIONS has exactly 6 items
2. CONTEXT_MENU_ACTIONS has exactly 10 items
3. No overlap between primary and context menu action IDs
4. All groups in CONTEXT_MENU_GROUPS contain valid ContextMenuActionIds
5. Old { deck1, deck2 } format rejected by validation → falls back to defaults
```

### Tech Debt Checkpoint

- [ ] File reduced from 102 → ~40 lines
- [ ] No `any` types
- [ ] Zero lint errors

---

## Sub-phase 3B: Simplified NodeUtilsBar

### What We Build

Replace the dual-deck NodeUtilsBar with a single flat bar of 6 primary actions + a "More..." button.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/components/nodes/NodeUtilsBar.tsx` | REWRITE | ~50 (down from 73) |
| `src/features/canvas/components/nodes/NodeUtilsBar.module.css` | EDIT | simplify (remove deck2 styles) |
| `src/features/canvas/components/nodes/NodeUtilsBar.types.ts` | EDIT | simplify props |
| `src/features/canvas/components/nodes/Deck1Actions.tsx` | DELETE | — |
| `src/features/canvas/components/nodes/Deck2Actions.tsx` | DELETE | — |
| `src/features/canvas/components/nodes/deckActionTypes.ts` | DELETE | — |
| `src/features/canvas/components/nodes/NodeUtilsBarDeckButtons.tsx` | DELETE | — |
| `src/features/canvas/components/nodes/__tests__/NodeUtilsBar.test.tsx` | REWRITE | update for new structure |

### Implementation

**New `NodeUtilsBar.tsx`**:

```typescript
export const NodeUtilsBar = React.memo(function NodeUtilsBar(props: NodeUtilsBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.bar} role="toolbar" aria-label={strings.canvas.nodeActions}>
      {/* 6 primary actions — flat list */}
      <TooltipButton icon={<SparkleIcon />} label={strings.nodeUtils.ai}
        onClick={props.onAIClick} />
      <TooltipButton icon={<LinkIcon />} label={strings.nodeUtils.connect}
        onClick={props.onConnectClick} />
      <TooltipButton icon={<SynthesizeIcon />} label={synthesisStrings.labels.synthesize}
        onClick={props.onSynthesizeClick}
        disabled={!props.hasChildren} />
      <TooltipButton icon={<CopyIcon />} label={strings.nodeUtils.copy}
        onClick={props.onCopyClick} />
      <TooltipButton icon={<ExportIcon />} label={exportStrings.labels.exportBranch}
        onClick={props.onExportClick}
        disabled={!props.hasChildren} />
      <TooltipButton icon={<TrashIcon />} label={strings.nodeUtils.delete}
        onClick={props.onDelete} />

      {/* More... button */}
      <TooltipButton icon={<MoreIcon />} label={strings.common.more}
        onClick={() => setMenuOpen(true)}
        aria-haspopup="true" aria-expanded={menuOpen} />

      {menuOpen && (
        <NodeContextMenu {...props} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
});
```

**Simplified props** (`NodeUtilsBar.types.ts`):
- Remove: `isSharing`, `isTransforming` (context menu handles these states internally)
- Remove: all deck-related props
- Add: `onSynthesizeClick`, `onExportClick`, `hasChildren`
- Keep: all callback props needed by context menu actions

**CSS simplification**:
- Remove `.deckTwo`, `.deckToggle`, `.deckExpanded` classes
- Single `.bar` with `flex-direction: column` (vertical stack)
- Same proximity hover mechanism (data attributes — no change needed)

### TDD Tests

```
1. Renders exactly 7 buttons (6 actions + More)
2. AI button calls onAIClick
3. Connect button calls onConnectClick
4. Synthesize button disabled when hasChildren=false
5. Export button disabled when hasChildren=false
6. Delete button calls onDelete
7. More button opens context menu
8. All labels from string resources
9. React.memo applied (structural test)
10. role="toolbar" and aria-label present
```

### Tech Debt Checkpoint

- [ ] NodeUtilsBar under 100 lines (target: ~50)
- [ ] 4 files deleted (Deck1Actions, Deck2Actions, deckActionTypes, DeckButtons)
- [ ] CSS simplified — no orphaned classes
- [ ] All strings from resources
- [ ] Zero lint errors

---

## Sub-phase 3C: Node Context Menu

### What We Build

A right-click context menu (also opened via "More..." button) that contains all secondary actions, grouped logically.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/components/nodes/NodeContextMenu.tsx` | NEW | ~90 |
| `src/features/canvas/components/nodes/NodeContextMenu.module.css` | NEW | ~70 |
| `src/features/canvas/components/nodes/__tests__/NodeContextMenu.test.tsx` | NEW | ~100 |
| `src/features/canvas/components/nodes/IdeaCard.tsx` | EDIT | +5 lines (onContextMenu handler) |

### Implementation

**`NodeContextMenu.tsx`**:

```typescript
interface NodeContextMenuProps {
  // All action callbacks from NodeUtilsBar.types.ts
  readonly onClose: () => void;
  readonly position?: { x: number; y: number }; // right-click position, or undefined for More... button
  // State for toggle items
  readonly isPinned: boolean;
  readonly isCollapsed: boolean;
  readonly isInPool: boolean;
}

export const NodeContextMenu = React.memo(function NodeContextMenu(props: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus trap + keyboard navigation
  useEffect(() => {
    const first = menuRef.current?.querySelector('button');
    first?.focus();
  }, []);

  // Close on Escape or outside click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [props.onClose]);

  return createPortal(
    <div className={styles.backdrop} onClick={props.onClose}>
      <div className={styles.menu} ref={menuRef} role="menu"
           onClick={(e) => e.stopPropagation()}>
        {/* Edit group */}
        <div className={styles.group} role="group" aria-label={strings.common.edit}>
          <MenuItem icon={<TagIcon />} label={strings.nodeUtils.tags}
            onClick={props.onTagClick} />
          <MenuItem icon={<ColorIcon />} label={strings.nodeUtils.color}
            onClick={props.onColorChange} />
        </div>
        <div className={styles.separator} role="separator" />
        {/* View group */}
        <div className={styles.group} role="group">
          <MenuItem icon={<CollapseIcon />}
            label={props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
            onClick={props.onCollapseToggle} />
          <MenuItem icon={<FocusIcon />} label={strings.nodeUtils.focus}
            onClick={props.onFocusClick} />
        </div>
        <div className={styles.separator} role="separator" />
        {/* Organize group */}
        {/* ... pin, duplicate, share, pool */}
        <div className={styles.separator} role="separator" />
        {/* Insert group */}
        {/* ... image, attachment */}
      </div>
    </div>,
    document.body
  );
});
```

**CSS** — all variables:
- Background: `var(--color-surface-elevated)`
- Border: `var(--color-border)`
- Shadow: `var(--shadow-dropdown)`
- Hover: `var(--color-primary)` with `opacity: 0.1`
- Separator: `var(--color-border)` with `opacity: 0.5`
- Min-width: `12rem` (using `rem` — relative unit)
- z-index: `var(--z-dropdown)`
- Border-radius: `var(--radius-lg)`

**IdeaCard.tsx** — add `onContextMenu` handler:
```typescript
const handleContextMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setContextMenuPos({ x: e.clientX, y: e.clientY });
}, []);
```

**Security**: Context menu is a UI component with no external data fetching. Portal renders to `document.body` — standard React pattern. No `innerHTML`. All callbacks are passed from parent (already validated).

### TDD Tests

```
1. Renders all 10 secondary action items
2. Groups separated by visual dividers
3. Click action → calls callback + closes menu
4. Escape → closes menu
5. Outside click → closes menu
6. Arrow keys navigate between items
7. Toggle items show correct state (Pin/Unpin, Collapse/Expand)
8. All labels from string resources
9. role="menu" and role="menuitem" present
10. Renders in portal (document.body)
11. Right-click on IdeaCard opens context menu at click position
```

### Tech Debt Checkpoint

- [ ] NodeContextMenu under 100 lines
- [ ] CSS uses only variables
- [ ] All strings from resources
- [ ] Keyboard accessible (arrow keys, Escape, focus trap)
- [ ] Portal rendering (no z-index fights with canvas)
- [ ] IdeaCard stays under 100 lines
- [ ] Zero lint errors

---

## Sub-phase 3D: Remove Toolbar Settings Section

### What We Build

Remove the drag-and-drop toolbar customization section from the Settings panel. Replace with a simple note or remove the tab entirely.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/app/components/SettingsPanel/sections/ToolbarSection.tsx` | DELETE | — |
| `src/app/components/SettingsPanel/sections/ToolbarSection.module.css` | DELETE | — |
| `src/app/components/SettingsPanel/sections/DeckColumn.tsx` | DELETE | — |
| `src/app/components/SettingsPanel/sections/DeckColumn.module.css` | DELETE | — |
| `src/app/components/SettingsPanel/sections/useToolbarDrag.ts` | DELETE | — |
| `src/app/components/SettingsPanel/sections/__tests__/ToolbarSection.integration.test.tsx` | DELETE | — |
| `src/app/components/SettingsPanel/SettingsPanel.tsx` | EDIT | remove toolbar tab |
| `src/shared/stores/settingsStore.ts` | EDIT | remove deck/reorder actions, simplify layout |
| `src/shared/localization/settingsStrings.ts` | EDIT | remove toolbar section strings |
| `src/shared/stores/__tests__/settingsStore.test.ts` | EDIT | remove deck-related tests |

### Implementation

**Settings panel**: Remove the "Toolbar" tab entirely (goes from 6 tabs to 5: Appearance, Canvas, Account, Keyboard, About).

**`settingsStore.ts`** simplification:
- Remove: `utilsBarLayout` state field
- Remove: `setUtilsBarActionDeck()`, `reorderUtilsBarAction()`, `resetUtilsBarLayout()`
- Keep: any other settings
- Migration: old localStorage keys are simply ignored on next load

**String cleanup**: Remove toolbar-related strings from `settingsStrings.ts`.

### TDD Tests

```
1. SettingsPanel renders 5 tabs (not 6)
2. No "Toolbar" tab in navigation
3. settingsStore has no utilsBarLayout in state
4. Old localStorage with utilsBarLayout → loads without error (ignored)
```

### Tech Debt Checkpoint

- [ ] 6 files deleted, net line count reduction ~400+
- [ ] Settings panel stays under 100 lines
- [ ] settingsStore stays under 300 lines
- [ ] No orphaned imports
- [ ] No orphaned CSS classes
- [ ] Zero lint errors

---

## Sub-phase 3E: Clearer Heading/Prompt UX

### What We Build

Small UX improvements to help users discover that the heading IS the AI prompt.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/components/nodes/NodeHeading.tsx` | EDIT | +3 lines |
| `src/features/canvas/components/nodes/NodeHeading.module.css` | EDIT | +5 lines |
| `src/shared/localization/strings.ts` | EDIT | update placeholder string |
| `src/features/canvas/components/nodes/__tests__/NodeHeading.test.tsx` | EDIT | +10 lines |

### Implementation

**Placeholder update**: Change heading placeholder from current text to something that hints at AI capability:
```typescript
// In strings.ts ideaCard section:
headingPlaceholder: 'Type a prompt or title...',
```

**AI mode badge**: When node is in `ai` input mode, show a small "AI" badge next to the heading field:
```typescript
{inputMode === 'ai' && (
  <span className={styles.aiBadge} aria-label={strings.ideaCard.aiMode}>
    {strings.ideaCard.aiBadgeLabel}
  </span>
)}
```

**CSS**: Badge uses `var(--color-primary)` background, `var(--color-surface)` text, `var(--radius-sm)` border-radius, `var(--font-size-xs)` font size.

### TDD Tests

```
1. Placeholder text matches string resource
2. AI badge visible when inputMode='ai'
3. AI badge hidden when inputMode='note'
4. Badge uses correct aria-label
```

### Tech Debt Checkpoint

- [ ] NodeHeading stays under 100 lines
- [ ] All strings from resources
- [ ] CSS uses variables
- [ ] Zero lint errors

---

## Sub-phase 3F: Structural & Integration Tests

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/components/nodes/__tests__/nodeSimplification.structural.test.ts` | NEW | ~50 |

### Structural Tests

```
1. NodeUtilsBar renders ≤ 7 buttons (6 actions + More)
2. No Deck1Actions, Deck2Actions, deckActionTypes imports anywhere in codebase
3. No ToolbarSection imports anywhere in codebase
4. No utilsBarLayout in settingsStore state
5. NodeContextMenu uses portal (createPortal)
6. All labels from string resources (grep scan)
7. No Zustand anti-patterns in modified files
```

### Build Gate Checklist (Full Phase 3)

```bash
npx tsc --noEmit          # zero errors
npm run lint               # zero errors
npm run test               # ALL pass
find src -name "*.ts*" | xargs wc -l | awk '$1 > 300'  # audit
```

---

## Phase 3 Tech Debt Audit

| Potential Debt | How We Prevented It |
|---------------|-------------------|
| Orphaned imports after deletion | `npx tsc --noEmit` catches missing imports; structural test scans for deleted file names |
| Orphaned CSS classes | Deleted CSS files entirely; remaining files audited for unused selectors |
| Old localStorage format | Existing validation rejects unknown format → falls back to defaults |
| Feature regression | All action callbacks preserved — they moved to context menu, not removed |
| Missing a11y | Context menu has full keyboard support (arrow keys, Escape, focus trap) |
| Hardcoded strings | Structural test scans all modified/new component files |
| Zustand anti-patterns | No new store subscriptions; existing ones unchanged |

**Net files deleted**: ~12 (6 source + 6 test)
**Net files created**: 4 (NodeContextMenu + CSS + test + structural test)
**Net line count change**: Approximately **-600 lines** (significant reduction)
