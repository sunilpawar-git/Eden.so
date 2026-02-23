/**
 * mergeNodes - Pure merge logic tests (TDD: RED → GREEN → REFACTOR)
 * Two-layer protection against background refresh overwriting local edits:
 *   Layer 1: Skip nodes currently being edited (editingNodeId guard)
 *   Layer 2: Timestamp-based merge for non-editing nodes (updatedAt comparison)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { mergeNodes, mergeEdges } from '../mergeNodes';

function makeNode(overrides: Partial<CanvasNode> & { id: string }): CanvasNode {
    return {
        workspaceId: 'ws-1',
        type: 'idea',
        data: { output: 'default' },
        position: { x: 0, y: 0 },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        ...overrides,
    };
}

function findNode(nodes: CanvasNode[], id: string): CanvasNode {
    const node = nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Node ${id} not found in merge result`);
    return node;
}

describe('mergeNodes', () => {
    describe('Layer 1: editingNodeId guard', () => {
        it('preserves the local node when it is currently being edited', () => {
            const local = makeNode({ id: 'n1', data: { output: 'draft typing' }, updatedAt: new Date('2025-01-01') });
            const remote = makeNode({ id: 'n1', data: { output: 'stale server' }, updatedAt: new Date('2025-06-01') });

            const result = mergeNodes([local], [remote], 'n1');

            expect(result).toHaveLength(1);
            expect(findNode(result, 'n1').data.output).toBe('draft typing');
        });

        it('preserves local node even when remote has a newer timestamp', () => {
            const local = makeNode({ id: 'n1', updatedAt: new Date('2025-01-01') });
            const remote = makeNode({ id: 'n1', updatedAt: new Date('2026-01-01') });

            const result = mergeNodes([local], [remote], 'n1');

            expect(findNode(result, 'n1').updatedAt).toEqual(new Date('2025-01-01'));
        });

        it('does not affect non-editing nodes', () => {
            const localEditing = makeNode({ id: 'n1', data: { output: 'editing' } });
            const localOther = makeNode({ id: 'n2', data: { output: 'old' }, updatedAt: new Date('2025-01-01') });
            const remoteOther = makeNode({ id: 'n2', data: { output: 'newer' }, updatedAt: new Date('2025-06-01') });

            const result = mergeNodes([localEditing, localOther], [localEditing, remoteOther], 'n1');

            const n2 = result.find((n) => n.id === 'n2');
            expect(n2?.data.output).toBe('newer');
        });
    });

    describe('Layer 2: timestamp-based merge', () => {
        it('keeps local node when local updatedAt is newer than remote', () => {
            const local = makeNode({ id: 'n1', data: { output: 'local edit' }, updatedAt: new Date('2025-06-01') });
            const remote = makeNode({ id: 'n1', data: { output: 'stale' }, updatedAt: new Date('2025-01-01') });

            const result = mergeNodes([local], [remote], null);

            expect(findNode(result, 'n1').data.output).toBe('local edit');
        });

        it('takes remote node when remote updatedAt is newer than local', () => {
            const local = makeNode({ id: 'n1', data: { output: 'old local' }, updatedAt: new Date('2025-01-01') });
            const remote = makeNode({ id: 'n1', data: { output: 'fresh remote' }, updatedAt: new Date('2025-06-01') });

            const result = mergeNodes([local], [remote], null);

            expect(findNode(result, 'n1').data.output).toBe('fresh remote');
        });

        it('takes remote node when timestamps are equal', () => {
            const ts = new Date('2025-03-01');
            const local = makeNode({ id: 'n1', data: { output: 'local' }, updatedAt: ts });
            const remote = makeNode({ id: 'n1', data: { output: 'remote' }, updatedAt: ts });

            const result = mergeNodes([local], [remote], null);

            expect(findNode(result, 'n1').data.output).toBe('remote');
        });
    });

    describe('node set reconciliation', () => {
        it('retains local-only nodes not yet synced to server', () => {
            const localOnly = makeNode({ id: 'new-local', data: { output: 'brand new' } });
            const shared = makeNode({ id: 'n1', updatedAt: new Date('2025-06-01') });

            const result = mergeNodes([localOnly, shared], [shared], null);

            expect(result).toHaveLength(2);
            expect(result.find((n) => n.id === 'new-local')).toBeDefined();
        });

        it('adds remote-only nodes that were created on another device', () => {
            const local = makeNode({ id: 'n1' });
            const remoteOnly = makeNode({ id: 'n-remote', data: { output: 'from other device' } });

            const result = mergeNodes([local], [local, remoteOnly], null);

            expect(result).toHaveLength(2);
            expect(result.find((n) => n.id === 'n-remote')?.data.output).toBe('from other device');
        });

        it('handles empty local nodes array', () => {
            const remote = makeNode({ id: 'n1' });

            const result = mergeNodes([], [remote], null);

            expect(result).toHaveLength(1);
            expect(result.find((n) => n.id === 'n1')).toBeDefined();
        });

        it('handles empty remote nodes array (retains all local)', () => {
            const local = makeNode({ id: 'n1' });

            const result = mergeNodes([local], [], null);

            expect(result).toHaveLength(1);
            expect(result.find((n) => n.id === 'n1')).toBeDefined();
        });

        it('handles both arrays empty', () => {
            const result = mergeNodes([], [], null);

            expect(result).toHaveLength(0);
        });
    });

    describe('graceful fallback for missing updatedAt', () => {
        it('favors remote when local node has no updatedAt', () => {
            const local = { ...makeNode({ id: 'n1', data: { output: 'local' } }), updatedAt: undefined } as unknown as CanvasNode;
            const remote = makeNode({ id: 'n1', data: { output: 'remote' }, updatedAt: new Date('2025-01-01') });

            const result = mergeNodes([local], [remote], null);

            expect(result.find((n) => n.id === 'n1')?.data.output).toBe('remote');
        });

        it('favors local when remote node has no updatedAt', () => {
            const local = makeNode({ id: 'n1', data: { output: 'local' }, updatedAt: new Date('2025-01-01') });
            const remote = { ...makeNode({ id: 'n1', data: { output: 'remote' } }), updatedAt: undefined } as unknown as CanvasNode;

            const result = mergeNodes([local], [remote], null);

            expect(result.find((n) => n.id === 'n1')?.data.output).toBe('local');
        });

        it('favors remote when neither has updatedAt', () => {
            const local = { ...makeNode({ id: 'n1', data: { output: 'local' } }), updatedAt: undefined } as unknown as CanvasNode;
            const remote = { ...makeNode({ id: 'n1', data: { output: 'remote' } }), updatedAt: undefined } as unknown as CanvasNode;

            const result = mergeNodes([local], [remote], null);

            expect(result.find((n) => n.id === 'n1')?.data.output).toBe('remote');
        });
    });

    describe('complex merge scenario', () => {
        it('correctly merges a realistic multi-node scenario', () => {
            const now = new Date();
            const older = new Date(now.getTime() - 60_000);
            const newer = new Date(now.getTime() + 60_000);

            const localNodes = [
                makeNode({ id: 'editing', data: { output: 'my draft' }, updatedAt: older }),
                makeNode({ id: 'recently-saved', data: { output: 'just saved' }, updatedAt: newer }),
                makeNode({ id: 'stale-local', data: { output: 'old stuff' }, updatedAt: older }),
                makeNode({ id: 'new-unsaved', data: { output: 'brand new' }, updatedAt: now }),
            ];

            const remoteNodes = [
                makeNode({ id: 'editing', data: { output: 'server version' }, updatedAt: newer }),
                makeNode({ id: 'recently-saved', data: { output: 'server stale' }, updatedAt: older }),
                makeNode({ id: 'stale-local', data: { output: 'server fresh' }, updatedAt: newer }),
                makeNode({ id: 'from-other-device', data: { output: 'other device' }, updatedAt: now }),
            ];

            const result = mergeNodes(localNodes, remoteNodes, 'editing');

            const byId = (id: string) => result.find((n) => n.id === id);

            expect(byId('editing')?.data.output).toBe('my draft');
            expect(byId('recently-saved')?.data.output).toBe('just saved');
            expect(byId('stale-local')?.data.output).toBe('server fresh');
            expect(byId('new-unsaved')?.data.output).toBe('brand new');
            expect(byId('from-other-device')?.data.output).toBe('other device');
            expect(result).toHaveLength(5);
        });
    });

    describe('structural purity guard', () => {
        it('has no side-effect imports or unsafe casts', () => {
            const src = readFileSync(
                resolve(__dirname, '../mergeNodes.ts'),
                'utf-8'
            );
            expect(src).not.toContain('/stores/');
            expect(src).not.toContain('firebase');
            expect(src).not.toContain('useCanvasStore');
            expect(src).not.toContain('workspaceService');
            expect(src).not.toContain('as any');
            expect(src).not.toContain('as string');
        });
    });
});

function makeEdge(overrides: Partial<CanvasEdge> & { id: string }): CanvasEdge {
    return {
        workspaceId: 'ws-1',
        sourceNodeId: 'src',
        targetNodeId: 'tgt',
        relationshipType: 'related',
        ...overrides,
    };
}

describe('mergeEdges', () => {
    it('returns remote edges when local is empty', () => {
        const remote = makeEdge({ id: 'e1' });
        const result = mergeEdges([], [remote]);
        expect(result).toHaveLength(1);
        expect(result.find((e) => e.id === 'e1')).toBeDefined();
    });

    it('retains local edges when remote is empty', () => {
        const local = makeEdge({ id: 'e1' });
        const result = mergeEdges([local], []);
        expect(result).toHaveLength(1);
        expect(result.find((e) => e.id === 'e1')).toBeDefined();
    });

    it('unions local-only and remote-only edges', () => {
        const local = makeEdge({ id: 'local-edge', sourceNodeId: 'a', targetNodeId: 'b' });
        const remote = makeEdge({ id: 'remote-edge', sourceNodeId: 'c', targetNodeId: 'd' });
        const result = mergeEdges([local], [remote]);
        expect(result).toHaveLength(2);
        expect(result.find((e) => e.id === 'local-edge')).toBeDefined();
        expect(result.find((e) => e.id === 'remote-edge')).toBeDefined();
    });

    it('deduplicates by ID, favoring remote for shared edges', () => {
        const local = makeEdge({ id: 'e1', relationshipType: 'related' });
        const remote = makeEdge({ id: 'e1', relationshipType: 'derived' });
        const result = mergeEdges([local], [remote]);
        expect(result).toHaveLength(1);
        expect(result.find((e) => e.id === 'e1')?.relationshipType).toBe('derived');
    });

    it('handles both arrays empty', () => {
        expect(mergeEdges([], [])).toHaveLength(0);
    });

    it('preserves local-only edges not yet synced', () => {
        const shared = makeEdge({ id: 'shared' });
        const localOnly = makeEdge({ id: 'new-local' });
        const result = mergeEdges([shared, localOnly], [shared]);
        expect(result).toHaveLength(2);
        expect(result.find((e) => e.id === 'new-local')).toBeDefined();
    });
});
