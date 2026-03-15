import { describe, it, expect, vi } from 'vitest';
import { migrateWorkspace, migrateNode, CURRENT_SCHEMA_VERSION } from '../migrationRunner';
import type { Workspace } from '@/features/workspace/types/workspace';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const baseWorkspace: Workspace = {
    id: 'ws-1', userId: 'u1', name: 'Test', canvasSettings: { backgroundColor: 'grid' },
    createdAt: new Date(), updatedAt: new Date(),
};

const baseNode: CanvasNode = {
    id: 'n1', workspaceId: 'ws-1', type: 'idea', data: { heading: 'test' },
    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
};

describe('migrateWorkspace', () => {
    it('sets schemaVersion to CURRENT on legacy doc (no version)', () => {
        const result = migrateWorkspace(baseWorkspace);
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('is idempotent — running twice yields the same result', () => {
        const first = migrateWorkspace(baseWorkspace);
        const second = migrateWorkspace(first);
        expect(second.schemaVersion).toBe(first.schemaVersion);
    });

    it('preserves all existing fields', () => {
        const result = migrateWorkspace({ ...baseWorkspace, nodeCount: 42 });
        expect(result.nodeCount).toBe(42);
        expect(result.name).toBe('Test');
    });
});

describe('migrateNode', () => {
    it('sets schemaVersion to CURRENT on legacy node', () => {
        const result = migrateNode(baseNode);
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('is idempotent', () => {
        const first = migrateNode(baseNode);
        const second = migrateNode(first);
        expect(second.schemaVersion).toBe(first.schemaVersion);
    });

    it('preserves all existing node fields', () => {
        const result = migrateNode({ ...baseNode, width: 300, height: 200 });
        expect(result.width).toBe(300);
        expect(result.height).toBe(200);
        expect(result.data.heading).toBe('test');
    });

    it('does not skip an already-current node', () => {
        const current = { ...baseNode, schemaVersion: CURRENT_SCHEMA_VERSION };
        const result = migrateNode(current);
        expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
});
