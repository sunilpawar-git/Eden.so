/**
 * Tests for canvasChangeHelpers — applyPositionAndRemoveChanges.
 */
import { describe, it, expect } from 'vitest';
import { applyPositionAndRemoveChanges } from '../canvasChangeHelpers';
import type { CanvasNode } from '../../types/node';
import type { NodeChange } from '@xyflow/react';

const createMockNode = (id: string, position = { x: 0, y: 0 }): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position,
    data: {},
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('applyPositionAndRemoveChanges', () => {
    it('returns original array when no changes', () => {
        const nodes = [
            createMockNode('n1'),
            createMockNode('n2'),
        ];
        const changes: NodeChange[] = [];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toBe(nodes);
    });

    it('returns original array when position change has same coordinates', () => {
        const nodes = [
            createMockNode('n1', { x: 10, y: 20 }),
            createMockNode('n2'),
        ];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 10, y: 20 } },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toBe(nodes);
    });

    it('applies position change and returns new array', () => {
        const nodes = [
            createMockNode('n1', { x: 0, y: 0 }),
            createMockNode('n2'),
        ];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 100, y: 200 } },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).not.toBe(nodes);
        expect(result).toHaveLength(2);
        expect(result[0]!.position).toEqual({ x: 100, y: 200 });
        expect(result[1]!.position).toEqual({ x: 0, y: 0 });
    });

    it('ignores position change for non-existent node id', () => {
        const nodes = [createMockNode('n1')];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n99', position: { x: 100, y: 200 } },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toBe(nodes);
    });

    it('removes node and returns new array', () => {
        const nodes = [
            createMockNode('n1'),
            createMockNode('n2'),
            createMockNode('n3'),
        ];
        const changes: NodeChange[] = [{ type: 'remove', id: 'n2' }];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).not.toBe(nodes);
        expect(result).toHaveLength(2);
        expect(result[0]!.id).toBe('n1');
        expect(result[1]!.id).toBe('n3');
    });

    it('ignores remove change for non-existent node id', () => {
        const nodes = [createMockNode('n1')];
        const changes: NodeChange[] = [{ type: 'remove', id: 'n99' }];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toBe(nodes);
    });

    it('applies multiple position changes in one pass', () => {
        const nodes = [
            createMockNode('n1', { x: 0, y: 0 }),
            createMockNode('n2', { x: 0, y: 0 }),
        ];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 10, y: 10 } },
            { type: 'position', id: 'n2', position: { x: 20, y: 20 } },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).not.toBe(nodes);
        expect(result[0]!.position).toEqual({ x: 10, y: 10 });
        expect(result[1]!.position).toEqual({ x: 20, y: 20 });
    });

    it('applies position and remove in same pass', () => {
        const nodes = [
            createMockNode('n1', { x: 0, y: 0 }),
            createMockNode('n2'),
            createMockNode('n3'),
        ];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 50, y: 50 } },
            { type: 'remove', id: 'n2' },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).not.toBe(nodes);
        expect(result).toHaveLength(2);
        expect(result[0]!.id).toBe('n1');
        expect(result[0]!.position).toEqual({ x: 50, y: 50 });
        expect(result[1]!.id).toBe('n3');
    });

    it('does not mutate original nodes array', () => {
        const nodes = [
            createMockNode('n1', { x: 0, y: 0 }),
            createMockNode('n2'),
        ];
        const originalFirst = nodes[0];
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 100, y: 100 } },
        ];
        applyPositionAndRemoveChanges(nodes, changes);

        expect(nodes[0]).toBe(originalFirst);
        expect(nodes[0]!.position).toEqual({ x: 0, y: 0 });
    });

    it('returns empty array when all nodes removed', () => {
        const nodes = [createMockNode('n1')];
        const changes: NodeChange[] = [{ type: 'remove', id: 'n1' }];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toHaveLength(0);
    });

    it('handles empty nodes array', () => {
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 0, y: 0 } },
            { type: 'remove', id: 'n1' },
        ];
        const result = applyPositionAndRemoveChanges([], changes);

        expect(result).toEqual([]);
    });

    it('handles multiple removes in one pass (splice index correctness)', () => {
        const nodes = [
            createMockNode('n1'),
            createMockNode('n2'),
            createMockNode('n3'),
            createMockNode('n4'),
        ];
        const changes: NodeChange[] = [
            { type: 'remove', id: 'n2' },
            { type: 'remove', id: 'n4' },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toHaveLength(2);
        expect(result[0]!.id).toBe('n1');
        expect(result[1]!.id).toBe('n3');
    });

    it('ignores select and dimensions change types (returns original)', () => {
        const nodes = [createMockNode('n1')];
        const changes: NodeChange[] = [
            { type: 'select', id: 'n1', selected: true },
            { type: 'dimensions', id: 'n1', dimensions: { width: 200, height: 100 } },
        ];
        const result = applyPositionAndRemoveChanges(nodes, changes);

        expect(result).toBe(nodes);
    });
});
