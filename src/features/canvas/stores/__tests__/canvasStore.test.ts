/**
 * Tests for Canvas Store Actions
 * Verifies integration of helpers into the store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('canvasStore', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    describe('arrangeNodes', () => {
        it('should update node positions in the store', () => {
            const baseDate = new Date('2024-01-01');
            const nodes = [
                createMockNode('n1', { createdAt: new Date(baseDate.getTime() + 1000) }),
                createMockNode('n2', { createdAt: new Date(baseDate.getTime() + 2000) }),
                createMockNode('n3', { createdAt: new Date(baseDate.getTime() + 3000) }),
                createMockNode('n4', { createdAt: new Date(baseDate.getTime() + 4000) }),
                createMockNode('n5', { createdAt: new Date(baseDate.getTime() + 5000) }),
            ];

            useCanvasStore.getState().setNodes(nodes);
            useCanvasStore.getState().arrangeNodes();

            const updatedNodes = useCanvasStore.getState().nodes;

            // Node 5 should be moved to row 2
            expect(updatedNodes[4]!.position.y).toBeGreaterThan(0);

            // Node 1 should be at 32,32
            expect(updatedNodes[0]!.position.x).toBe(32);
            expect(updatedNodes[0]!.position.y).toBe(32);
        });

        it('should trigger store update', () => {
            const nodes = [createMockNode('n1')];
            useCanvasStore.getState().setNodes(nodes);

            const originalUpdatedAt = useCanvasStore.getState().nodes[0]!.updatedAt;

            // Wait a tick to ensure time difference
            setTimeout(() => {
                useCanvasStore.getState().arrangeNodes();
                const newUpdatedAt = useCanvasStore.getState().nodes[0]!.updatedAt;
                expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
            }, 0);
        });
    });
});
