/**
 * Structural test: useWorkspaceSwitcher must use atomic setState for workspace swap
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
    resolve(__dirname, '../hooks/useWorkspaceSwitcher.ts'),
    'utf-8'
);

describe('useWorkspaceSwitcher — atomic canvas update', () => {
    it('must NOT use useCanvasStore() without a selector', () => {
        expect(src).not.toMatch(/useCanvasStore\(\s*\)/);
    });

    it('must use useCanvasStore.setState for atomic swap', () => {
        expect(src).toMatch(/useCanvasStore\.setState\(/);
    });

    it('must NOT use separate setNodes/setEdges calls', () => {
        expect(src).not.toMatch(/setNodes\(newNodes\)/);
        expect(src).not.toMatch(/setEdges\(newEdges\)/);
    });
});
