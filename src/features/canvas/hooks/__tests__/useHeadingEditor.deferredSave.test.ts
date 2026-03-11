/**
 * Structural guard: heading edits must NOT trigger per-keystroke store writes.
 *
 * Root cause: every updateNodeHeading call (via onHeadingChange) creates a new
 * nodes[] array, rebuilds the getNodeMap cache, and forces O(N)
 * useSyncExternalStore snapshot comparisons across every IdeaCard — causing
 * visible typing stutter in the heading.
 *
 * Fix: useHeadingEditor commits the heading to the store on blur and before
 * AI submit only. A commitHeading helper with a lastCommittedRef guard avoids
 * redundant writes when blur fires after Enter/Escape already committed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
    resolve(__dirname, '../useHeadingEditor.ts'),
    'utf-8',
);

describe('useHeadingEditor — deferred heading save (no per-keystroke store writes)', () => {
    it('must NOT pass onHeadingChange as onUpdate to useTipTapEditor', () => {
        // onUpdate fires on every keystroke in TipTap. Wiring onHeadingChange
        // (which calls updateNodeHeading) to onUpdate causes a full nodes[]
        // store update per keystroke → getNodeMap rebuild → O(N) re-renders.
        expect(src).not.toMatch(/onUpdate\s*:\s*onHeadingChange/);
    });

    it('must define a commitHeading helper with deduplication guard', () => {
        // commitHeading only writes when the value has actually changed,
        // preventing redundant store writes when blur fires after Enter/Escape.
        expect(src).toMatch(/commitHeading/);
        expect(src).toMatch(/lastCommittedRef/);
    });

    it('must commit heading in the blur handler', () => {
        // When the heading editor loses focus, the current text must be
        // persisted to the store via commitHeading.
        const afterHandleBlur = src.substring(src.indexOf('const handleBlur'));
        const blurBlock = afterHandleBlur.substring(0, afterHandleBlur.indexOf('useEffect'));
        expect(blurBlock).toContain('commitHeading');
    });

    it('must commit heading before onSubmitAI in the Enter handler', () => {
        // In AI mode, generateFromPrompt reads the heading from the store.
        // commitHeading must be called before onSubmitAI to ensure the latest
        // typed heading is in the store at generation time.
        const afterOnEnter = src.substring(src.indexOf('onEnter:'));
        const enterBlock = afterOnEnter.substring(0, afterOnEnter.indexOf('onEscape:'));
        const commitIdx = enterBlock.indexOf('commitHeading');
        const submitIdx = enterBlock.indexOf('onSubmitAI');
        expect(commitIdx).toBeGreaterThan(-1);
        expect(submitIdx).toBeGreaterThan(-1);
        expect(commitIdx).toBeLessThan(submitIdx);
    });

    it('must keep lastCommittedRef in sync with external heading changes', () => {
        // When not editing, lastCommittedRef should track the heading prop
        // (updated by undo/redo, AI generation, etc.) so commitHeading
        // doesn't produce a spurious write on the next blur.
        expect(src).toMatch(/lastCommittedRef\.current\s*=\s*heading/);
    });

    it('must sync editor content when heading prop changes externally while not editing', () => {
        // When focus mode updates the heading in the store and the IdeaCard is
        // not editing (isFocusedOnThisNode suppresses isEditing), the heading
        // TipTap editor still shows old initialContent. A content-sync effect
        // must call setContent(heading) when the heading prop changes while
        // not editing — mirroring useIdeaCardEditor's prevOutputRef pattern.
        expect(src).toMatch(/setContent/);
        // The effect must guard: only sync when NOT editing and heading changed
        expect(src).toMatch(/!isEditing/);
    });
});
