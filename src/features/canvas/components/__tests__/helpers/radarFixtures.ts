import type { CanvasNode } from '../../../types/node';

/**
 * Shared test factory for creating CanvasNode fixtures in radar tests.
 * SSOT: avoids duplicate makeNode() helpers across test files.
 */
export function makeNode(id: string, x: number, y: number): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: '' },
        position: { x, y },
        width: 280,
        height: 220,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
