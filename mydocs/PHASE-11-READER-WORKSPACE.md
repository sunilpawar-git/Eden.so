# Phase 11 (Revised): Reader Workspace for BASB (PDF/Image First, Security-First)

## Summary

This is the complete replacement plan for Phase 11.

- Scope locked: PDF/Image reader first.
- Link preview click behavior stays external by default.
- Web iframe reader is deferred (CSP and cross-origin constraints).
- Reader lifecycle stays in focus mode.
- High-frequency reader UI state uses local `useReducer` (isolated dispatch chain from canvas store).
- Each phase has strict quality gates: TDD, integration coverage, full lint/typecheck/tests.

## Incorporated Findings (Ordered by Severity)

1. Critical CSP conflict resolved by removing web iframe scope from Phase 11.
2. Attachment reader-open plumbing made explicit via extension option callbacks with node identity.
3. Quote insertion changed from markdown-string insertion to ProseMirror node insertion.
4. Link preview default behavior preserved (external open remains primary).
5. PDF rendering constrained to paged mode for predictable performance.
6. Test scope expanded to match FocusOverlay and editor lifecycle complexity.

## Public Interfaces and Type Contracts

### Reader source types for Phase 11

```ts
type ReaderSource =
  | { type: 'pdf'; url: string; filename: string }
  | { type: 'image'; url: string; filename: string };
```

### Focus store additions

- `readerContext: { nodeId: string; source: ReaderSource } | null`
- `openReader(nodeId: string, source: ReaderSource): void`
- `closeReader(): void`

### Reader local reducer (UI state only, no canvas store writes)

State:
- `paneSide`
- `splitRatio`
- `currentPage`
- `selectionDraft`

Actions:
- `SET_SPLIT`
- `FLIP_PANES`
- `SET_PAGE`
- `SET_SELECTION`
- `CLEAR_SELECTION`

### Attachment extension callback contract

- `nodeId` passed via extension options
- `onOpenReader?: (nodeId: string, source: ReaderSource) => void`

### Quote insertion contract

Insert ProseMirror nodes, not raw markdown:
- `blockquote` node with selected text
- attribution paragraph with filename + page

## Phase-Wise Plan

## Phase 11.1: Reader Core Shell (No Source-Specific Viewer)

### Build

- Add `readerContext` to focus store with `openReader`/`closeReader`.
- Branch FocusOverlay rendering:
- default focus editor when `readerContext` is null
- reader shell when `readerContext` exists
- Implement reader shell layout controls and split ratio handling.
- Keep split/pane/page/selection state in local reducer.
- Add escape handling order: close reader first, then exit focus.
- Use string resources and CSS variables only.

### TDD and integration

- Unit tests for focus store reader transitions.
- Unit tests for reducer action semantics and split clamping.
- Integration test: FocusOverlay switches modes correctly.
- Integration test: Escape priority behavior is correct with editor/focus layers.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- Temporary adapter props during FocusOverlay split refactor.

Debt removal before phase close:
- Remove adapter props and duplicate constants.
- No `TODO` or `FIXME` left.
- New/changed files under 300 lines via extraction.
- Stale-closure risks audited and removed.

## Phase 11.2: Attachment Entry and Reader Wiring (PDF/Image Only)

### Build

- Add `Open in reader` action to attachment card.
- Pass node identity and reader callback through `AttachmentExtension.configure`.
- Preserve existing attachment actions (`download`, `open in new tab`, `remove`).
- Do not change link preview primary click behavior.

### TDD and integration

- Unit test: attachment action invokes reader callback with correct payload.
- Integration test: attachment click opens reader context and reader shell.
- Integration test: existing attachment actions remain unchanged.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- Temporary callback wrappers while extension options are threaded.

Debt removal before phase close:
- Remove duplicate URL validation paths; retain one SSOT utility.
- Remove bridge wrappers once typed wiring is complete.
- Reconfirm selector-only Zustand usage in touched components.

## Phase 11.3: PDF Viewer and Quote-to-Note Pipeline

### Build

- Implement paged PDF viewer with selectable text layer for current page.
- Show contextual `Add quote` action for non-empty PDF selection.
- Insert quote using ProseMirror nodes:
- `blockquote` for quote body
- attribution paragraph with file/page metadata
- Add quote sanitization and max length guard.
- Keep store writes deterministic and one-shot.

### TDD and integration

- Unit test: quote formatter and attribution builder.
- Unit test: selection normalization and max-length behavior.
- Integration test: select text -> add quote -> editor updates once.
- Integration test: focus/blur/escape lifecycle remains correct.
- Integration test: large PDF paging does not cause render-loop regressions.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- Temporary text selection helpers while page model stabilizes.

Debt removal before phase close:
- Consolidate quote formatting in one service (SSOT).
- Remove debug selection/page code.
- Run effect dependency audit to eliminate update-depth loop risk.

## Phase 11.4: Image Reader Pane and UX/Accessibility Hardening

### Build

- Add image source pane with contained rendering and scroll-safe behavior.
- Keep note editor live beside image source.
- Add keyboard and accessibility polish for reader controls/divider.
- Add analytics events:
- `reader_opened`
- `reader_closed`
- `reader_quote_inserted`
- `reader_source_type`
- Enforce safe URL usage for all reader source opens.

### TDD and integration

- Unit test: image source rendering states and safe URL guard paths.
- Integration test: image attachment -> open reader -> close reader flow.
- Integration test: no regression in global keyboard shortcuts and escape stack.
- Structural tests for string/color compliance on touched files.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- Temporary analytics wrappers during event schema stabilization.

Debt removal before phase close:
- Remove temporary wrappers and keep one analytics helper.
- Remove duplicated labels and enforce localization SSOT.
- Verify new reader module files are under 300 lines.

## Phase 11.5: Release Stabilization (Mandatory Final Phase)

### Build

- Run full regression sweep across canvas editing, focus mode, attachments, and shortcuts.
- Security regression checklist:
- no CSP weakening
- no unsafe HTML insertion
- no unsanitized URL open paths
- Verify Zustand selector discipline in reader path.
- Verify local reducer dispatch chain remains isolated from canvas store.

### TDD and integration

- Integration test: attachment -> reader -> quote -> save -> reopen -> content persisted.
- Re-run all existing suites and ensure no behavioral regressions.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- None.

Debt removal before phase close:
- Zero open debt policy: remove transitional APIs, dead code, duplicated constants, and temporary guards.
- Update phase doc and follow-up docs to match implemented behavior and non-goals.

## Better Alternative Paths (Post-Phase 11)

## Path A (Recommended): Web Reader via Extracted Content (Phase 12)

- Build server-side URL extraction and sanitization pipeline.
- Render extracted article text in reader pane.
- Enable reliable web quote capture without iframe/CSP fragility.

## Path B (Not recommended near-term): iframe Web Reader

- Requires CSP expansion and ongoing embed-failure UX work.
- Still cannot reliably capture text selection across origins.
- Higher maintenance risk with lower reliability.

## Global Engineering Constraints (Always On)

- Maintain MVVM, DRY, SOLID, SSOT.
- No hardcoded user-facing strings.
- No hardcoded colors; use universal color scheme variables.
- No Zustand anti-patterns (selector subscriptions only).
- No ReactFlow cascade risk from reader interactions.
- No stale-closure effect bugs.
- Zero lint errors in every phase.
- Cyber security compliance in all new/updated code paths.
- One-shot reducer dispatch chain isolated from canvas store for reader UI state.

## Assumptions and Defaults

- Phase 11 supports only attachment-based reader sources (`pdf`, `image`).
- Link preview cards keep external-open as primary behavior.
- No Firestore schema changes in Phase 11.
- Reader session state is ephemeral UI state.
- Persisted artifact remains node note content.
