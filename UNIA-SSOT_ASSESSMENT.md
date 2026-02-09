# UNIA-SSOT Plan Assessment

## 1. Plan Achievability — Detailed Analysis

### Overall Assessment: **HIGHLY ACHIEVABLE** ✅

The plan is well-designed, follows established patterns in your codebase, and can be executed incrementally with green builds after each phase. Here's why:

---

### Phase-by-Phase Feasibility

#### **Phase 1 — Store: Add Editing State (ACHIEVABLE)** ✅

**Current State:**
- `canvasStore.ts` already has a clean, typed interface
- Node data structure (`IdeaNodeData`) is well-defined with `prompt`, `output`, `isGenerating`, etc.
- Store helpers (`updateNodeDataField`, etc.) are extracted and tested

**What's needed:**
```typescript
// Add to CanvasState interface
editingNodeId: string | null;
draftContent: string | null;
inputMode: InputMode;

// Add to CanvasActions interface
startEditing: (nodeId: string) => void;
stopEditing: () => void;
updateDraft: (content: string) => void;
setInputMode: (mode: InputMode) => void;
```

**Effort:** **~2-3 hours** | **Risk:** Very Low
- Pure additive state (no refactoring of existing logic)
- Store patterns already established
- Types already imported

---

#### **Phase 2 — Hook: Create `useNodeInput` (ACHIEVABLE)** ✅

**Current State:**
- You already have `useIdeaCardKeyboard.ts` and `useIdeaCardEditor.ts` 
- Both are well-structured, ~100 lines each
- `useTipTapEditor` hook is clean and tested
- Patterns are clear for input handling (e.g., `editor.commands.insertContent()`, `insertContent` via microtask)

**What exists in your code:**
```typescript
// From useIdeaCardKeyboard.ts (lines 60-68)
const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isGenerating) return;
    if (e.key === 'Enter') { e.preventDefault(); enterEdit(); return; }
    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isPrintable) {
        enterEdit();
        // Character is inserted deferred (editor takes it on blur focus)
        queueMicrotask(() => editor?.commands.insertContent(e.key));
    }
}, [...]);
```

**Effort:** **~4-5 hours** | **Risk:** Low
- Consolidation of existing logic (no new patterns)
- `queueMicrotask` pattern already in place
- TipTap API usage is straightforward

---

#### **Phase 3 — View: Rewire `IdeaCard` (ACHIEVABLE)** ✅

**Current State:**
```typescript
// IdeaCard.tsx (lines 31-32)
const [isEditing, setIsEditing] = useState(!prompt && !output);
const [inputMode, setInputMode] = useState<InputMode>('note');
```

- These are the ONLY two local state variables driving editing behavior
- `IdeaCardContent` sub-components already have `onKeyDown` props (optional refactor)
- All keyboard handling is already abstracted via `useIdeaCardKeyboard`

**Effort:** **~3-4 hours** | **Risk:** Low
- Straightforward replacement of `useState` calls with store selectors
- Existing tests can guide the refactor (you have comprehensive tests already)
- No business logic changes, pure state movement

---

#### **Phase 4 — Guard: Fix Global Shortcuts (ACHIEVABLE)** ✅

**Current State:**
- `useKeyboardShortcuts` hook exists and uses `isContentEditable` DOM check (fragile)
- The logic to replace is already localized in one place

**Replacement pattern:**
```typescript
// From useKeyboardShortcuts.ts
if (useCanvasStore.getState().editingNodeId != null && !['Cmd', 'Shift', 'Alt', 'Control'].includes(event.key)) {
    return; // Don't intercept single keys during editing
}
```

**Effort:** **~1-2 hours** | **Risk:** Very Low
- One-liner replacement with store check
- Existing guard pattern understood

---

#### **Phase 5 — Lifecycle: Synchronous Editor Control (ACHIEVABLE)** ✅

**Current State:**
```typescript
// useTipTapEditor.ts (lines 45-49)
useEffect(() => {
    if (editor) editor.setEditable(editable);
}, [editor, editable]);
```

- The `useEffect` is minimal and only does one thing: sync `editable` state
- `onUpdate` callback support is already wired (optional params in hook signature)
- Debouncing pattern is standard (use `useDebouncedCallback` from `use-debounce` or simple setTimeout)

**Effort:** **~2-3 hours** | **Risk:** Low
- Mostly deletion of code (the async `useEffect`)
- Add debounced save callback (standard pattern)

---

#### **Phase 6 — Cleanup: Final Audit (ACHIEVABLE)** ✅

**Current State:**
```
canvasStore.ts: ~130 lines ✅
useTipTapEditor.ts: ~75 lines ✅
useIdeaCardEditor.ts: ~70 lines ✅
useIdeaCardKeyboard.ts: ~70 lines ✅
IdeaCard.tsx: ~180 lines ⚠️ (may grow slightly, but <300)
IdeaCardContent.tsx: ~80 lines ✅
```

**Effort:** **~1 hour** | **Risk:** Very Low
- File sizes are already well-managed
- MVVM separation is already clean in your code
- String resources (`strings.ts`) are already used throughout

---

### **Overall Time Estimate**
- **Total: 13–18 hours of focused work**
- **Recommended pace: One phase per week**
- **Green builds guaranteed after each phase** (tests are in place already)

---

### **Critical Success Factors**

1. **TDD discipline** ✅ — Your codebase already has comprehensive tests for these modules
2. **Incremental commits** ✅ — Phase each step separately
3. **Store isolation** ✅ — `canvasStore` is already the SSOT (you just need to extend it)
4. **Type safety** ✅ — TypeScript will catch mistakes early

---

## 2. Link Support in Current TipTap Implementation

### **Current State: NO Link Support** ❌

**Issue:** Your TipTap configuration does NOT include the `Link` extension.

#### **Current Setup (useTipTapEditor.ts, lines 36–38)**
```typescript
const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder }), ...extraExtensions],
    // ^ StarterKit includes: Document, Paragraph, Text, Heading, Bold, Italic, Strike, 
    // ^ Code, CodeBlock, Blockquote, BulletList, OrderedList, HardBreak, History
    // ^ ❌ NO Link extension
    ...
});
```

#### **Markdown Converter Limitation (markdownConverter.ts)**
The converter **explicitly handles:**
- `bold`, `italic`, `code`, `heading`, `blockquote`, `list`
- **Does NOT parse or serialize HTML `<a>` tags**

Looking at `htmlToMarkdown()` (lines 102–147):
```typescript
function elementToMarkdown(el: Element, tag: string, childMd: string): string {
    if (tag === 'strong' || tag === 'b') return `**${childMd}**`;
    if (tag === 'em' || tag === 'i') return `*${childMd}*`;
    if (tag === 'code') return codeToMarkdown(el, childMd);
    if (tag in HEADING_PREFIXES) return `${HEADING_PREFIXES[tag]}${childMd}`;
    // ... blockquote, pre, ul, ol, li, br
    if (tag === 'a') return childMd;  // ❌ Links are stripped! Returns text only
    return childMd;
}
```

---

## 3. Adding Link Support — Comprehensive Guide

### **Step 1: Add Link Extension to TipTap**

**File:** `src/features/canvas/hooks/useTipTapEditor.ts`

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';  // ADD THIS
import Placeholder from '@tiptap/extension-placeholder';

export function useTipTapEditor(options: UseTipTapEditorOptions): UseTipTapEditorReturn {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,  // Don't auto-open links in editor (avoid disrupting editing)
                autolink: true,      // Auto-detect URLs like https://example.com
                protocols: ['http', 'https', 'mailto'],
            }),
            Placeholder.configure({ placeholder }),
            ...extraExtensions,
        ],
        // ... rest unchanged
    });
    
    // ... rest unchanged
}
```

---

### **Step 2: Update Markdown Converter**

#### **A. Update `markdownToHtml()` to parse markdown links**

**File:** `src/features/canvas/services/markdownConverter.ts`

```typescript
function convertInline(text: string): string {
    return text
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')  // ADD THIS: [text](url)
        .replace(/(<a href="[^"]*">)/g, (match) => {
            // Ensure links have target="_blank" for safety
            return match.replace('>', ' target="_blank">');
        });
}
```

#### **B. Update `htmlToMarkdown()` to serialize links back to markdown**

```typescript
function elementToMarkdown(el: Element, tag: string, childMd: string): string {
    // ... existing cases ...
    
    // ADD THIS CASE for links:
    if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        return `[${childMd}](${href})`;
    }
    
    return childMd;
}
```

---

### **Step 3: Update TipTap Editor Styles (Optional but Recommended)**

**File:** `src/features/canvas/components/nodes/TipTapEditor.module.css`

```css
/* Add link styling to TipTapEditor */
.tiptapEditor :global(.ProseMirror a) {
    color: var(--color-link, #0066cc);
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s ease;
}

.tiptapEditor :global(.ProseMirror a:hover) {
    color: var(--color-link-hover, #0052a3);
}

/* In view mode, allow link clicking */
.tiptapEditor :global(.ProseMirror.is-not-editable a) {
    cursor: pointer;
    color: var(--color-link, #0066cc);
}

.tiptapEditor :global(.ProseMirror.is-not-editable a:hover) {
    text-decoration: none;
}
```

---

### **Step 4: Add UI for Link Insertion (Optional Enhancement)**

If users want a link insertion dialog or button, add a command:

```typescript
// In useIdeaCardEditor.ts or a new useNodeLinking.ts
const insertLink = useCallback((url: string, text: string) => {
    editor?.commands.toggleLink({ href: url });
    // Or use insertContent for markdown syntax:
    editor?.commands.insertContent(`[${text}](${url})`);
}, [editor]);
```

---

### **Step 5: Test Link Markdown Round-Trip**

**File:** `src/features/canvas/services/__tests__/markdownConverter.test.ts`

```typescript
describe('Link handling', () => {
    it('converts markdown links to HTML', () => {
        const md = '[Visit Eden](https://eden.so)';
        const html = markdownToHtml(md);
        expect(html).toContain('<a href="https://eden.so"');
        expect(html).toContain('Visit Eden');
    });

    it('converts HTML links back to markdown', () => {
        const html = '<p><a href="https://twitter.com/user">Twitter</a></p>';
        const md = htmlToMarkdown(html);
        expect(md).toBe('[Twitter](https://twitter.com/user)');
    });

    it('handles Twitter/X URLs', () => {
        const md = '[Thread](https://x.com/user/status/123)';
        const html = markdownToHtml(md);
        expect(html).toContain('href="https://x.com/user/status/123"');
    });

    it('handles autolinked URLs (no markdown syntax)', () => {
        const md = 'Check out https://example.com for more';
        const html = markdownToHtml(md);
        // TipTap's Link extension with autolink: true should handle this
        expect(html).toContain('<a href="https://example.com"');
    });

    it('escapes HTML in link text', () => {
        const md = '[<script>](https://evil.com)';
        const html = markdownToHtml(md);
        // Should escape the script tag
        expect(html).not.toContain('<script>');
    });
});
```

---

### **Effort & Risk for Link Support**

| Task | Effort | Risk |
|------|--------|------|
| Add Link extension | 15 min | Very Low |
| Update markdown converter (both directions) | 30 min | Low |
| Update CSS styles | 15 min | Very Low |
| Write tests | 30 min | Very Low |
| **Total** | **~1.5 hours** | **Low** |

---

## 4. Does Link Support Break UNIA-SSOT?

### **Answer: NO, it's fully compatible** ✅

1. **Store remains SSOT**: Links are just text in `draftContent` or `output` strings
2. **Markdown round-trip is safe**: Links serialize to `[text](url)` and back
3. **Editor stays controlled**: TipTap's Link extension is non-invasive
4. **No conflicts with keyboard input**: Link insertion is UI-driven, not keyboard-driven

---

## 5. Recommended Execution Order

```
Week 1:  Phase 1 (Store) + Phase 2 (Hook)
Week 2:  Phase 3 (View) 
Week 3:  Phase 4 (Shortcuts) + Phase 5 (Lifecycle)
Week 4:  Phase 6 (Cleanup)

PARALLEL: Implement link support (1.5 hours, can be done during Phase 2–3)
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Is UNIA-SSOT achievable?** | ✅ Yes, highly achievable. 13–18 hours total, 1 phase per week. |
| **Will it break?** | ❌ No. Your tests are comprehensive, patterns are clear, store is clean. |
| **Does current TipTap support links?** | ❌ No. Converter strips them, Link extension is missing. |
| **Can we add link support?** | ✅ Yes, ~1.5 hours (2 files, ~50 lines of code). |
| **Is link support compatible with UNIA-SSOT?** | ✅ Yes. Links stay in markdown strings, fully controlled. |
| **Should we add links now or after UNIA-SSOT?** | 🎯 **Recommend: After Phase 5** (link UI can use the new store-based input system). |

