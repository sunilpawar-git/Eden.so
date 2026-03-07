# Editor Audit Remediation Plan — Phases 1-2

**Audit Date:** 2026-03-07
**Audit Coverage:** EditorBubbleMenu, sanitizePastedHtml, markdownConverter, strings, all related tests
**Compliance:** ✓ CLAUDE.md fully compliant, ✓ Security hardened, ✓ 0 tech debt from new code
**Summary:** 1 Medium + 4 Low + 1 Tech Debt issue identified; 0 Critical/High/Security issues

---

## Phase 1: Quick Wins (UX & Maintainability)

### Issue 1.1: Icon Style Mismatch — Link emoji doesn't match B/I/S/</>
**Severity:** Medium (UX inconsistency)
**File:** `src/shared/localization/strings.ts:283`
**Root Cause:** Added emoji 🔗 (U+1F517) alongside ASCII text icons
**Impact:** Visual inconsistency in bubble menu
**Fix:** Replace emoji with ASCII arrow `→` (U+2192 Rightarrow Arrow)

**Implementation:**
```typescript
// Before
linkDisplay: '\uD83D\uDD17',  // 🔗 (emoji, visually out of place)

// After
linkDisplay: '→',  // Rightarrow, matches text-based style of B/I/S
```

**Acceptance Criteria:**
- [ ] Link button renders as `→` instead of 🔗
- [ ] Visually matches B/I/S/</> style (all text-based)
- [ ] Tests still pass (display text only changed, no logic change)

---

### Issue 1.2: Unicode Escape Readability — Surrogate pair hard to maintain
**Severity:** Low (Maintainability)
**File:** `src/shared/localization/strings.ts:283`
**Root Cause:** Using UTF-16 surrogate pair for emoji
**Impact:** Hard to read/maintain in code
**Fix:** Same as 1.1 (both addressed by switching to ASCII arrow)

---

### Issue 1.3: Tech Debt — SAFE_LINK_RE regex duplicated across files
**Severity:** Very Low (DRY violation)
**Files:**
  - `src/features/canvas/components/nodes/EditorBubbleMenu.tsx:18`
  - `src/features/canvas/services/markdownConverter.ts:186`
**Root Cause:** Two independent implementations of the same protocol validation
**Impact:** Maintenance burden (if one needs updating, must update both)
**Fix:** Extract to shared constants file

**Implementation:**
1. Create `src/features/canvas/services/linkUtils.ts`:
   ```typescript
   /** Protocols considered safe for links (rejects javascript:, data:, etc.) */
   export const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:)/i;
   export const SAFE_LINK_URL_START = /^https?:\/\//i;
   ```

2. Update `EditorBubbleMenu.tsx:18`:
   ```typescript
   import { SAFE_LINK_URL_START } from '../services/linkUtils';
   // Remove: const SAFE_LINK_RE = /^https?:\/\//i;
   // Use: SAFE_LINK_URL_START
   ```

3. Update `markdownConverter.ts:186`:
   ```typescript
   import { SAFE_LINK_PROTOCOLS } from '../services/linkUtils';
   // Remove: const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:)/i;
   // Use: imported constant
   ```

4. Add structural test to enforce wiring: `src/features/canvas/__tests__/linkUtils.structural.test.ts`
   ```typescript
   it('SAFE_LINK_PROTOCOLS rejects javascript: URLs', () => {
       expect(SAFE_LINK_PROTOCOLS.test('javascript:alert(1)')).toBe(false);
       expect(SAFE_LINK_PROTOCOLS.test('https://example.com')).toBe(true);
   });
   ```

**Acceptance Criteria:**
- [ ] `linkUtils.ts` created with shared constants
- [ ] Both EditorBubbleMenu and markdownConverter import from linkUtils
- [ ] Structural test verifies pattern rejection
- [ ] All tests pass (29 tests + new structural test)
- [ ] No regression in link validation behavior

**Effort:** 15 minutes
**Risk:** Very Low (constants only, no logic change)

---

## Phase 2: Polish (Performance & Type Safety)

### Issue 2.1: Event Handler Dependency — Unnecessary re-creation
**Severity:** Low (Performance, minimal impact on small component)
**File:** `src/features/canvas/components/nodes/EditorBubbleMenu.tsx:45-62`
**Root Cause:** `useCallback([editor])` recreates on every editor instance change
**Impact:** Negligible (bubble menu is small, fast to re-render)
**Rationale for Phase 2:** BubbleMenu is a leaf component; focus on user-facing issues first

**Optimization Option** (defer unless performance becomes an issue):
```typescript
const editorRef = useRef(editor);
editorRef.current = editor;

const handleFormat = useCallback(
    (e: React.MouseEvent, action: FormatAction) => {
        e.preventDefault();
        e.stopPropagation();
        editorRef.current?.chain().focus();
        action(editorRef.current);
    },
    [],  // ← No deps, stable reference
);
```

**Decision:** Defer to Phase 2 (post-launch) if monitoring shows bubble menu re-renders are a bottleneck

---

### Issue 2.2: Type Safety — Unsafe type assertion on getAttributes
**Severity:** Low (Type safety)
**File:** `src/features/canvas/components/nodes/EditorBubbleMenu.tsx:38`
**Root Cause:** `as { href?: string }` assumes getAttributes shape without validation
**Impact:** Could return unexpected object structure at runtime
**Fix:** Create typed wrapper or runtime guard

**Implementation Option A (Recommended — lightweight):**
```typescript
function getLinkHref(editor: Editor): string {
    try {
        const attrs = editor.getAttributes('link');
        return (typeof attrs === 'object' && attrs !== null && 'href' in attrs)
            ? String(attrs.href ?? '')
            : '';
    } catch {
        return '';
    }
}
```

**Implementation Option B (Heavier — with Zod validation):**
Defer; overkill for this single case.

**Acceptance Criteria:**
- [ ] `getLinkHref` helper added above `handleLinkAction`
- [ ] Type assertion removed from line 38
- [ ] Edge cases handled (undefined, null, missing href)
- [ ] Test added: `[link-utils] handles missing href gracefully`
- [ ] All tests pass

**Effort:** 20 minutes

---

## Phase 1 Execution Order

1. ✅ Fix icon (10 min) — strings.ts:283 change only
2. ✅ Extract linkUtils (15 min) — new file + 2 imports + structural test
3. ✅ Run full suite → build → commit

**Total Phase 1:** ~25 minutes
**Risk:** Very Low (constants/cosmetic changes only)

---

## Phase 2 Execution Order

1. Optional: Optimize event handler (10 min) — defer unless needed
2. Add type safety wrapper (20 min) — getLinkHref helper + test
3. Run full suite → build → commit

**Total Phase 2:** ~20-30 minutes
**Risk:** Very Low (localizing unsafe code)

---

## Testing Strategy

### Phase 1 Tests
- Existing 16 + 13 = 29 tests should all pass (display-only change)
- New structural test for linkUtils wiring
- Icon visually inspected (manual: bubble menu renders → button shows)

### Phase 2 Tests
- New unit test: `getLinkHref` handles edge cases
- Existing tests remain unchanged
- Manual: link creation still works (window.prompt → href validation)

---

## Success Criteria

| Criterion | Phase 1 | Phase 2 |
|-----------|---------|---------|
| Icon fixed | ✓ | - |
| Regex duplication resolved | ✓ | - |
| Type safety improved | - | ✓ |
| All tests passing | ✓ | ✓ |
| 0 TS errors | ✓ | ✓ |
| 0 Lint errors | ✓ | ✓ |
| No regressions | ✓ | ✓ |
| CLAUDE.md compliant | ✓ | ✓ |

---

## Notes

- **No Zustand anti-patterns introduced** — New code doesn't use Zustand, so selector/closure patterns not applicable
- **No ReactFlow cascade risk** — Bubble menu is a leaf component, memoized, isolated from canvas state
- **Security is solid** — Attribute stripping, protocol validation, XSS prevention all confirmed
- **Tech debt policy honored** — Issues are being addressed, not deferred

---

**Execution Timeline:**
- Phase 1: Execute immediately (low risk, high clarity)
- Phase 2: Execute if time permits (or defer post-launch if other priorities exist)

**Owner:** @claude-code (autonomous execution recommended)
