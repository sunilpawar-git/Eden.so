/**
 * Node Serializer Tests - Date ↔ epoch round-trip
 */
import { describe, it, expect } from 'vitest';
import { serializeNodes, deserializeNodes } from '../services/nodeSerializer';
import type { CanvasNode } from '@/features/canvas/types/node';

const makeNode = (overrides: Partial<CanvasNode> = {}): CanvasNode => ({
    id: 'node-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: { prompt: 'test prompt' },
    position: { x: 100, y: 200 },
    width: 280,
    height: 150,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
});

describe('nodeSerializer', () => {
    describe('serializeNodes', () => {
        it('should convert Date fields to epoch numbers', () => {
            const serialized = serializeNodes([makeNode()]);
            const first = serialized[0]!;

            expect(first.createdAt).toBe(new Date('2025-01-15T10:00:00Z').getTime());
            expect(first.updatedAt).toBe(new Date('2025-01-15T12:00:00Z').getTime());
        });

        it('should preserve non-Date fields', () => {
            const serialized = serializeNodes([makeNode()]);
            const first = serialized[0]!;

            expect(first.id).toBe('node-1');
            expect(first.position).toEqual({ x: 100, y: 200 });
            expect(first.data).toEqual({ prompt: 'test prompt' });
            expect(first.width).toBe(280);
        });

        it('should handle empty array', () => {
            expect(serializeNodes([])).toEqual([]);
        });

        it('should handle nodes with undefined optional fields', () => {
            const node = makeNode({ width: undefined, height: undefined });
            const first = serializeNodes([node])[0]!;

            expect(first.width).toBeUndefined();
            expect(first.height).toBeUndefined();
        });
    });

    describe('deserializeNodes', () => {
        it('should convert epoch numbers back to Date objects', () => {
            const first = deserializeNodes(serializeNodes([makeNode()]))[0]!;

            expect(first.createdAt).toBeInstanceOf(Date);
            expect(first.updatedAt).toBeInstanceOf(Date);
        });

        it('should round-trip correctly', () => {
            const orig = makeNode();
            const rt = deserializeNodes(serializeNodes([orig]))[0]!;

            expect(rt.id).toBe(orig.id);
            expect(rt.position).toEqual(orig.position);
            expect(rt.data).toEqual(orig.data);
            expect(rt.createdAt.getTime()).toBe(orig.createdAt.getTime());
            expect(rt.updatedAt.getTime()).toBe(orig.updatedAt.getTime());
        });

        it('should handle empty array', () => {
            expect(deserializeNodes([])).toEqual([]);
        });
    });
});
