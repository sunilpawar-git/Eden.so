/**
 * Workspace Store Pool Tests — toggleWorkspacePool
 * TDD: tests written before implementation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import type { Workspace } from '../../types/workspace';

function createTestWorkspace(id: string, overrides: Partial<Workspace> = {}): Workspace {
    return {
        id,
        userId: 'user-1',
        name: `Workspace ${id}`,
        canvasSettings: { backgroundColor: 'grid' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        orderIndex: 0,
        type: 'workspace',
        ...overrides,
    };
}

describe('workspaceStore — Pool actions', () => {
    beforeEach(() => {
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [
                createTestWorkspace('ws-1'),
                createTestWorkspace('ws-2', { includeAllNodesInPool: true }),
                createTestWorkspace('ws-3', { includeAllNodesInPool: false }),
            ],
            isLoading: false,
            isSwitching: false,
        });
    });

    describe('toggleWorkspacePool', () => {
        it('flips includeAllNodesInPool from undefined to true', () => {
            useWorkspaceStore.getState().toggleWorkspacePool('ws-1');
            const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-1');
            expect(ws?.includeAllNodesInPool).toBe(true);
        });

        it('flips includeAllNodesInPool from true to false', () => {
            useWorkspaceStore.getState().toggleWorkspacePool('ws-2');
            const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-2');
            expect(ws?.includeAllNodesInPool).toBe(false);
        });

        it('flips includeAllNodesInPool from false to true', () => {
            useWorkspaceStore.getState().toggleWorkspacePool('ws-3');
            const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-3');
            expect(ws?.includeAllNodesInPool).toBe(true);
        });

        it('does not mutate other workspaces', () => {
            useWorkspaceStore.getState().toggleWorkspacePool('ws-1');
            const ws2 = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-2');
            const ws3 = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-3');
            expect(ws2?.includeAllNodesInPool).toBe(true);
            expect(ws3?.includeAllNodesInPool).toBe(false);
        });

        it('updates updatedAt timestamp on toggled workspace', () => {
            const before = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-1')!.updatedAt;
            useWorkspaceStore.getState().toggleWorkspacePool('ws-1');
            const after = useWorkspaceStore.getState().workspaces.find((w) => w.id === 'ws-1')!.updatedAt;
            expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });

        it('is a no-op for non-existent workspaceId', () => {
            const before = useWorkspaceStore.getState().workspaces;
            useWorkspaceStore.getState().toggleWorkspacePool('nonexistent');
            const after = useWorkspaceStore.getState().workspaces;
            expect(after).toEqual(before);
        });
    });
});
