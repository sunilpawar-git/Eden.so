# Phase-Wise Execution Plan — ActionStation

This document defines a **phase-wise plan** where each phase:
- Delivers a **successful build** (`npm run build`).
- Follows **TDD** (unit + integration tests); **all tests pass** before phase completion.
- **Eliminates all tech debt** incurred in that phase before moving on (no carry-over).
- Upholds **CLAUDE.md** and clean-code principles: files ≤300 lines, MVVM, DRY, SOLID, SSOT, string resources, theme/color scheme, React render safety (no "Maximum update depth exceeded"), and 100% security compliance.

---

## Principles (Non-Negotiable)

| Principle | Rule |
|-----------|------|
| **File size** | Max 300 lines; split immediately if exceeded |
| **Component** | Max 100 lines; extract sub-components |
| **Function** | Max 50 lines; extract helpers |
| **Hook** | Max 75 lines; split by responsibility |
| **Strings** | No hardcoded UI strings; use `strings.*` from `@/shared/localization` |
| **Colors** | No hardcoded colors; use CSS variables / theme |
| **Secrets** | No API keys/tokens in code; `.env.local` + env in CI |
| **React** | Stable refs/identity for ReactFlow; no setState-in-render or effect loops that cause "Maximum update depth exceeded" |
| **Security** | Input validation, XSS sanitization, no `any`, CORS/Firebase rules as per CLAUDE.md |

---

## Baseline (Pre-Phase 1)

- **Build**: `npm run build` succeeds (typecheck + lint + test + vite build).
- **Tests**: All unit and integration tests pass.
- **Lint**: 13 warnings (max-lines-per-function, complexity, nested ternary, unused eslint-disable). These are treated as Phase 1 tech debt.
- **Files**: No file exceeds 300 lines.
- **Strings**: Centralized in `src/shared/localization`; feature-level strings in features.

---

## Phase 1: Lint Clean & Function-Size Compliance

**Goal**: Zero lint warnings; all functions/hooks within line limits; build and all tests green.

### Scope

1. **Fix all 13 ESLint warnings** (no new warnings):
   - `useCalendarSync`: reduce to ≤80 lines (extract helpers or split hook).
   - `NodeResizeButtons`: ≤80 lines (extract sub-components or helpers).
   - `ShareMenu`: ≤80 lines (extract sub-components or helpers).
   - `TransformMenu`: ≤80 lines (extract sub-components or helpers).
   - `nodeUtilsControllerReducer`: reduce complexity to ≤20 (split branches into small functions).
   - `gridLayoutService`: remove nested ternary (use `if`/switch or helper).
   - `canvasStore` arrow: ≤80 lines (extract reducer/helpers).
   - `knowledgeBankStore` arrow: ≤80 lines (extract logic).
   - `useWorkspaceLoader`: ≤80 lines (extract helpers).
   - Remove unused eslint-disable in `canvasStore.test.ts` and `NodeUtilsBar.tsx`.
   - Fix strict-boolean-expressions in `editorPipeline.integration.test.ts` and `slashCommandFlow.integration.test.ts`.

2. **TDD**: For each refactor:
   - **Red**: Rely on existing tests; if new behavior, write failing test first.
   - **Green**: Refactor until tests pass.
   - **Refactor**: Keep files ≤300 lines, functions ≤50/80 as required.

3. **Verification**:
   - `npm run lint` → 0 errors, 0 warnings.
   - `npm run test` → 100% pass.
   - `npm run build` → success.

### Tech Debt (Phase 1)

- **Incurred**: Refactoring may introduce temporary duplication or extra files.
- **Removal**: Before phase sign-off:
  - Remove any duplicated logic (DRY) into shared helpers.
  - Ensure no new hardcoded strings or colors.
  - Re-run file audit: `find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300'` → empty.
  - Document any new string keys in localization if added.

**Phase 1 complete when**: Lint clean, all tests pass, build success, tech debt log updated and debt cleared.

---

## Phase 2: String & Theme Audit (Zero Hardcoding)

**Goal**: No hardcoded UI strings or colors in components; 100% string resources and theme/CSS variables.

### Scope

1. **String audit**:
   - Search for literal strings in JSX/TSX (e.g. "Submit", "Cancel", button/label text).
   - Move every user-facing string into `src/shared/localization` (or feature-level `*Strings.ts`) and use `strings.*`.
   - Add tests that assert no known literals in component output where appropriate (e.g. strings.test or snapshot of keys).

2. **Theme/color audit**:
   - Ensure no inline `style={{ color: '...' }}` or hex/rgb in components.
   - All visual tokens from CSS variables or theme (e.g. `var(--...)` or design tokens).
   - Document theme contract (e.g. in `src/styles`) if not already.

3. **TDD**:
   - **Red**: Tests that fail when a component uses a hardcoded string (e.g. string-audit test or localization test).
   - **Green**: Replace with `strings.*` and fix tests.
   - **Refactor**: Keep string files under 300 lines; split by feature if needed.

4. **Verification**:
   - `npm run build` and `npm run test` pass.
   - Manual/grep audit: no remaining hardcoded UI strings or colors in `src` components.

### Tech Debt (Phase 2)

- **Incurred**: New string keys or duplicate keys across features.
- **Removal**: Deduplicate keys (SSOT), ensure consistent naming; trim unused keys; run lint and tests.

**Phase 2 complete when**: String and theme audits pass, build and tests green, tech debt cleared.

---

## Phase 3: React Render Safety & Stability

**Goal**: No risk of "Maximum update depth exceeded"; stable identity for ReactFlow and effect hygiene.

### Scope

1. **Render-safety review**:
   - Identify components that pass non-stable props to ReactFlow (e.g. new object/array every render).
   - Confirm `buildRfNodes` and node data shells remain stable (only structural changes produce new node refs).
   - Audit `useEffect` + `setState` patterns: no effect that sets state in a way that re-triggers the same effect (dependency loops).

2. **Fixes**:
   - Memoize callbacks passed to ReactFlow/canvas (`useCallback` with correct deps).
   - Ensure no state updates during render (only in effects or event handlers).
   - Add a short "render safety" section in `buildRfNodes.ts` or architecture doc if needed.

3. **TDD**:
   - **Red**: Integration test that stresses canvas updates (e.g. rapid content/selection changes) and would catch update-depth issues if regressed.
   - **Green**: Implement/fix memoization and stability; test passes.
   - **Refactor**: Keep functions under line limits.

4. **Verification**:
   - `npm run test` (including integration tests) pass.
   - `npm run build` success.
   - No new lint issues.

### Tech Debt (Phase 3)

- **Incurred**: Possible over-memoization or extra files for stability helpers.
- **Removal**: Remove unnecessary memoization; consolidate helpers; re-run tests and lint.

**Phase 3 complete when**: Render-safety rules documented and satisfied, all tests pass, build success, tech debt cleared.

---

## Phase 4: Security Hardening & Compliance

**Goal**: 100% security compliance per CLAUDE.md (no secrets, validation, XSS, CORS, Firebase rules).

### Scope

1. **Secrets**:
   - Confirm no API keys/tokens in repo; `.env.local` in `.gitignore`; CI uses env vars only.
   - If Gemini/backend: keys only in Cloud Functions or server-side env.

2. **Input & XSS**:
   - All user content validated/sanitized before render or storage.
   - Markdown/HTML rendered only through sanitized path (e.g. MarkdownRenderer with sanitization).

3. **Types**:
   - No `any` in production code paths; strict TypeScript.

4. **Firebase**:
   - Rules follow CLAUDE.md (user isolation, deny by default, read/write only for owning user).

5. **TDD**:
   - **Red**: Security-focused tests (e.g. sanitization, validation, rules structure).
   - **Green**: Implement or adjust code until tests pass.
   - **Refactor**: No new lint or line-limit violations.

6. **Verification**:
   - `npm run build` and `npm run test` pass.
   - Optional: run `security-check` script; confirm CORS and Firebase rules documented.

### Tech Debt (Phase 4)

- **Incurred**: New validation/sanitization helpers or test files.
- **Removal**: Deduplicate validation logic (DRY); ensure no redundant checks; keep files ≤300 lines; all tests green.

**Phase 4 complete when**: Security checklist complete, all tests pass, build success, tech debt cleared.

---

## Phase 5: Integration Test Coverage & TDD Gaps

**Goal**: Critical paths covered by integration tests; TDD protocol followed for any new behavior; coverage targets met where specified.

### Scope

1. **Coverage**:
   - Identify critical user flows (auth, workspace switch, canvas edit, AI, Knowledge Bank) that lack integration tests.
   - Add integration tests (TDD: red then green) for at least one high-value flow per feature if missing.

2. **Existing tests**:
   - Ensure all integration tests are stable and documented (what they guarantee).
   - No flaky tests; fix or remove flakiness.

3. **TDD**:
   - For any new integration test: write failing test first, then minimal code to pass, then refactor.
   - Keep tests and production code within line/function limits.

4. **Verification**:
   - `npm run test` and `npm run test:coverage` (if available); build success.
   - Coverage meets or improves toward project targets (stores 90%, services 85%, utils 100%, hooks 80%, components 60% critical paths).

### Tech Debt (Phase 5)

- **Incurred**: New test files or shared test helpers.
- **Removal**: Extract shared test utilities (DRY); remove duplicate setup; ensure no hardcoded strings in tests (use strings or test-only constants); lint clean and build green.

**Phase 5 complete when**: Integration coverage gaps addressed, all tests pass, build success, tech debt cleared.

---

## Phase 6: Final Audit & Documentation

**Goal**: Full project audit against CLAUDE.md; docs updated; ready for production.

### Scope

1. **Audit**:
   - File line count: no file >300 lines.
   - Function/hook line limits: enforced.
   - Lint: 0 errors, 0 warnings.
   - No hardcoded strings or colors in UI.
   - No secrets in code; security checklist signed off.

2. **Documentation**:
   - Update README or ARCHITECTURE with any new patterns (e.g. render safety, localization).
   - Phase plan: mark all phases complete and archive tech-debt resolutions.

3. **Verification**:
   - `npm run check` and `npm run build` success.
   - String audit and file audit scripts pass (as in CLAUDE.md).

### Tech Debt (Phase 6)

- **Incurred**: None expected if previous phases closed debt.
- **Removal**: Any last-minute duplication or lint fixes; then freeze.

**Phase 6 complete when**: Audit passes, docs updated, build and tests green.

---

## Execution Order

1. **Phase 1** → Lint clean, function size.
2. **Phase 2** → Strings & theme.
3. **Phase 3** → React render safety.
4. **Phase 4** → Security.
5. **Phase 5** → Integration tests & TDD gaps.
6. **Phase 6** → Final audit & docs.

Do not start phase N+1 until phase N is complete (build green, all tests pass, tech debt for N fully removed and documented).

---

## Tech Debt Log Template (Per Phase)

At end of each phase, fill:

```markdown
## Phase N — Tech Debt

**Incurred**:
- (List what was introduced: e.g. "Temporary helper X in file Y", "New string file Z")

**Removal**:
- (List what was done: e.g. "Moved helper to shared/utils; removed duplicate"; "Merged string keys into strings.workspace")

**Verification**:
- Lint: 0 errors, 0 warnings
- Tests: all pass
- Build: success
- File audit: no file >300 lines
```

This ensures no tech debt is carried forward.
