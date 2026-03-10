/**
 * useAutosave — Performance structural tests
 *
 * Prevents main-thread blocking: previously, useAutosave ran JSON.stringify
 * on ALL nodes synchronously in the useEffect body on every nodes change.
 * With 500 nodes, this blocked the main thread for 10-30ms per mutation.
 *
 * Fix: use reference-based dirty tracking in the effect body; defer
 * JSON.stringify to the debounced timeout callback (runs once per 2s).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../hooks/useAutosave.ts'), 'utf-8');

describe('useAutosave — performance invariants', () => {
    it('useEffect body does NOT call JSON.stringify directly', () => {
        const effectBody = extractEffectBody(SRC);
        expect(effectBody).toBeDefined();
        const hasDirectStringify = effectBody!.includes('JSON.stringify(');
        expect(
            hasDirectStringify,
            'useEffect body calls JSON.stringify synchronously — defer to debounced callback',
        ).toBe(false);
    });

    it('uses reference-based dirty tracking (prevNodesRef or similar)', () => {
        expect(
            SRC.includes('prevNodesRef') || SRC.includes('lastNodesRef'),
            'useAutosave should use ref-based change detection, not JSON.stringify comparison in the hot path',
        ).toBe(true);
    });
});

/** Extract the first useEffect body from the source code. */
function extractEffectBody(src: string): string | undefined {
    const idx = src.indexOf('useEffect(');
    if (idx === -1) return undefined;
    let depth = 0;
    let start = -1;
    for (let i = idx; i < src.length; i++) {
        if (src[i] === '{') {
            if (start === -1) start = i;
            depth++;
        } else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(start, i + 1);
        }
    }
    return undefined;
}
