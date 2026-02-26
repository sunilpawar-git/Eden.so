/**
 * Structural test: useNodeTransformation must use getState() for Zustand actions
 * to prevent unstable function references that cause re-render loops.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
    resolve(__dirname, '../hooks/useNodeTransformation.ts'),
    'utf-8'
);

describe('useNodeTransformation — stable action references', () => {
    it('must NOT use useCanvasStore() without a selector', () => {
        expect(src).not.toMatch(/useCanvasStore\(\s*\)/);
    });

    it('must NOT select action functions via selector (causes unstable refs)', () => {
        expect(src).not.toMatch(/useCanvasStore\(\s*\(s\)\s*=>\s*s\.updateNodeOutput\s*\)/);
    });

    it('must use getState() for store actions inside callbacks', () => {
        expect(src).toMatch(/useCanvasStore\.getState\(\)\.updateNodeOutput/);
    });
});
