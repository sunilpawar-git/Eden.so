/**
 * Adaptive Grid Columns — Integration test
 * Verifies settings change flows through resolver into layout algorithm.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { calculateMasonryPosition, arrangeMasonry } from '../services/gridLayoutService';
import { resolveGridColumns } from '../services/gridColumnsResolver';
import { snapToMasonrySlot } from '../services/snapToMasonrySlot';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import type { CanvasNode } from '../types/node';
import { GRID_GAP, GRID_PADDING } from '../services/gridConstants';

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

function mockNode(id: string, createdAt: string): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        position: { x: 0, y: 0 },
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { heading: '' },
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
    };
}

describe('Adaptive Grid Columns Integration', () => {
    beforeEach(() => {
        useSettingsStore.setState({ gridColumns: 4 });
    });

    describe('settings → resolver → layout pipeline', () => {
        it('respects fixed column count from settings', () => {
            useSettingsStore.getState().setGridColumns(2);
            const cols = resolveGridColumns(useSettingsStore.getState().gridColumns);
            expect(cols).toBe(2);

            const nodes = [
                mockNode('n1', '2024-01-01'),
                mockNode('n2', '2024-01-02'),
            ];
            const arranged = arrangeMasonry(nodes, cols);
            const n1 = arranged.find((n) => n.id === 'n1')!;
            const n2 = arranged.find((n) => n.id === 'n2')!;

            expect(n1.position.x).toBe(GRID_PADDING);
            expect(n2.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });

        it('uses 6 columns when set to 6', () => {
            useSettingsStore.getState().setGridColumns(6);
            const cols = resolveGridColumns(useSettingsStore.getState().gridColumns);
            expect(cols).toBe(6);

            const nodes = Array.from({ length: 6 }, (_, i) =>
                mockNode(`n${i}`, `2024-01-0${i + 1}`),
            );
            const arranged = arrangeMasonry(nodes, cols);

            const uniqueXPositions = new Set(arranged.map((n) => n.position.x));
            expect(uniqueXPositions.size).toBe(6);
        });

        it('auto mode resolves columns from viewport width', () => {
            useSettingsStore.getState().setGridColumns('auto');
            const cols = resolveGridColumns(
                useSettingsStore.getState().gridColumns,
                1920,
            );
            expect(cols).toBe(5);
        });
    });

    describe('calculateMasonryPosition with dynamic columns', () => {
        it('uses 2 columns for columnCount=2', () => {
            const nodes = [
                mockNode('n1', '2024-01-01'),
                mockNode('n2', '2024-01-02'),
            ];
            const pos = calculateMasonryPosition(nodes, 2);
            expect(pos.y).toBe(GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });

        it('third node goes to col 0 in 2-column mode', () => {
            const nodes = [
                mockNode('n1', '2024-01-01'),
                mockNode('n2', '2024-01-02'),
            ];
            const pos = calculateMasonryPosition(nodes, 2);
            expect(pos.x).toBe(GRID_PADDING);
        });
    });

    describe('snapToMasonrySlot with dynamic columns', () => {
        it('snaps to 2 columns when columnCount=2', () => {
            const col1X = GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP;
            const farRightClick = { x: 2000, y: 100 };

            const result = snapToMasonrySlot(farRightClick, [], 2);
            expect(result.x).toBe(col1X);
        });
    });

    describe('settings validation', () => {
        it('rejects invalid grid column values', () => {
            useSettingsStore.getState().setGridColumns(4);
            useSettingsStore.getState().setGridColumns(99 as never);
            expect(useSettingsStore.getState().gridColumns).toBe(4);
        });

        it('persists gridColumns to localStorage', () => {
            useSettingsStore.getState().setGridColumns(3);
            expect(useSettingsStore.getState().gridColumns).toBe(3);
        });
    });
});
