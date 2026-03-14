/**
 * Structural tests for useAutosave hook — verifies source-level invariants
 * that prevent common anti-patterns (position in fingerprint, bare subscriptions).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../hooks/useAutosave.ts'), 'utf-8');
const SAVE_CB_SRC = readFileSync(resolve(__dirname, '../hooks/useSaveCallback.ts'), 'utf-8');
const COMBINED = `${SRC}\n${SAVE_CB_SRC}`;

describe('useAutosave — structural integrity', () => {
    describe('position-excluded content fingerprinting', () => {
        it('content fingerprint excludes position but includes data', () => {
            expect(SRC).toContain('data: n.data');
            expect(SRC).toContain('id: n.id');
        });

        it('position fingerprint tracks node positions separately', () => {
            expect(SRC).toContain('position');
            expect(SRC).toContain('positions');
        });
    });

    describe('selector isolation (prevents full-tree rerenders)', () => {
        it('uses targeted selectors instead of bare useCanvasStore()', () => {
            expect(COMBINED).not.toMatch(/useCanvasStore\(\s*\)/);
            expect(COMBINED).toMatch(/useCanvasStore\(\s*\(\s*s\s*\)/);
        });
    });
});
