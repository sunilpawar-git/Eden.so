/**
 * useAutosave — Structural tests for stale-closure prevention and ref-reset.
 *
 * H1: setTimeout callback must read from refs (not closed-over variables)
 *     to avoid stale fingerprints → redundant Firestore writes.
 * H3: Refs must reset when workspaceId changes to prevent phantom writes.
 * M1: Dead `contentDirty` variable (identical to `dirty`) must be removed.
 * M9: Loading path must use synchronous ref assignment, not queueMicrotask.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../hooks/useAutosave.ts'), 'utf-8');

describe('useAutosave — stale-closure prevention (H1)', () => {
    it('setTimeout callback reads fingerprint from refs, not closed-over variables', () => {
        const timeoutIdx = SRC.indexOf('setTimeout(');
        expect(timeoutIdx).toBeGreaterThan(-1);
        const timeoutBody = extractBalancedBlock(SRC, timeoutIdx);
        expect(timeoutBody).toBeDefined();

        expect(
            timeoutBody!.includes('prevNodesRef.current') || timeoutBody!.includes('latestNodesRef'),
            'setTimeout callback must read nodes from a ref to avoid stale closure',
        ).toBe(true);

        expect(
            timeoutBody!.includes('prevEdgesRef.current') || timeoutBody!.includes('latestEdgesRef'),
            'setTimeout callback must read edges from a ref to avoid stale closure',
        ).toBe(true);

        expect(
            timeoutBody!.includes('prevWorkspaceJsonRef.current') || timeoutBody!.includes('latestWsJsonRef'),
            'setTimeout callback must read workspace JSON from a ref to avoid stale closure',
        ).toBe(true);
    });
});

describe('useAutosave — ref reset on workspace switch (H3)', () => {
    it('resets tracking refs when workspaceId changes', () => {
        expect(
            SRC.includes('prevWsIdRef') || SRC.includes('prevWorkspaceIdRef'),
            'Must track previous workspaceId to detect workspace switch and reset refs',
        ).toBe(true);
    });
});

describe('useAutosave — no dead code (M1)', () => {
    it('does not contain a redundant contentDirty variable', () => {
        expect(SRC).not.toContain('contentDirty');
    });
});

describe('useAutosave — no queueMicrotask in loading path (M9)', () => {
    it('loading path does not use queueMicrotask', () => {
        expect(SRC).not.toContain('queueMicrotask');
    });
});

function extractBalancedBlock(src: string, startFrom: number): string | undefined {
    let depth = 0;
    let start = -1;
    for (let i = startFrom; i < src.length; i++) {
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
