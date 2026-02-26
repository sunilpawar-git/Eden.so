/**
 * EMPTY_SELECTED_IDS Constant Tests
 * Verifies stable empty Set reference across canvasStore actions
 * and structural compliance in production files.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore, EMPTY_SELECTED_IDS } from '../canvasStore';

describe('EMPTY_SELECTED_IDS constant', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    it('is exported as a frozen Set<string> with size 0', () => {
        expect(EMPTY_SELECTED_IDS).toBeInstanceOf(Set);
        expect(EMPTY_SELECTED_IDS.size).toBe(0);
        expect(Object.isFrozen(EMPTY_SELECTED_IDS)).toBe(true);
    });

    it('initial state uses the same EMPTY_SELECTED_IDS reference', () => {
        const state = useCanvasStore.getState();
        expect(state.selectedNodeIds).toBe(EMPTY_SELECTED_IDS);
    });

    it('clearSelection on an empty store keeps the same reference', () => {
        const before = useCanvasStore.getState().selectedNodeIds;
        expect(before).toBe(EMPTY_SELECTED_IDS);

        useCanvasStore.getState().clearSelection();

        const after = useCanvasStore.getState().selectedNodeIds;
        expect(after).toBe(EMPTY_SELECTED_IDS);
        expect(after).toBe(before);
    });

    it('clearSelection after selecting a node returns EMPTY_SELECTED_IDS', () => {
        useCanvasStore.getState().selectNode('n1');
        expect(useCanvasStore.getState().selectedNodeIds.size).toBe(1);

        useCanvasStore.getState().clearSelection();

        expect(useCanvasStore.getState().selectedNodeIds).toBe(EMPTY_SELECTED_IDS);
    });

    it('clearCanvas resets selectedNodeIds to EMPTY_SELECTED_IDS', () => {
        useCanvasStore.getState().selectNode('n1');
        useCanvasStore.getState().clearCanvas();

        expect(useCanvasStore.getState().selectedNodeIds).toBe(EMPTY_SELECTED_IDS);
    });
});

describe('EMPTY_SELECTED_IDS structural compliance', () => {
    const readSource = (relPath: string): string =>
        readFileSync(resolve(__dirname, relPath), 'utf-8');

    it('canvasStore.ts imports and uses EMPTY_SELECTED_IDS', () => {
        const src = readSource('../canvasStore.ts');
        expect(src).toContain('EMPTY_SELECTED_IDS');
    });

    it('canvasStore.ts does not use bare new Set() for empty selectedNodeIds', () => {
        const src = readSource('../canvasStore.ts');
        const lines = src.split('\n');
        for (const line of lines) {
            if (!line.includes('selectedNodeIds')) continue;
            if (line.trimStart().startsWith('//')) continue;
            const hasBareEmptySet = /selectedNodeIds.*new\s+Set\s*\(\s*\)/.test(line);
            const hasBareEmptyGeneric = /selectedNodeIds.*new\s+Set<string>\s*\(\s*\)/.test(line);
            if (hasBareEmptySet || hasBareEmptyGeneric) {
                expect.fail(
                    `Found bare "new Set()" for selectedNodeIds in canvasStore.ts: ${line.trim()}`
                );
            }
        }
    });

    it('useWorkspaceSwitcher.ts uses EMPTY_SELECTED_IDS', () => {
        const src = readSource(
            '../../../workspace/hooks/useWorkspaceSwitcher.ts'
        );
        expect(src).toContain('EMPTY_SELECTED_IDS');
        expect(src).not.toMatch(/selectedNodeIds:\s*new\s+Set/);
    });

    it('useWorkspaceLoader.ts uses EMPTY_SELECTED_IDS', () => {
        const src = readSource(
            '../../../workspace/hooks/useWorkspaceLoader.ts'
        );
        expect(src).toContain('EMPTY_SELECTED_IDS');
        expect(src).not.toMatch(/selectedNodeIds:\s*new\s+Set/);
    });
});
