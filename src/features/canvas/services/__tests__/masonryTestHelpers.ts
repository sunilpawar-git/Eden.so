/**
 * Masonry Layout Test Helpers
 * Shared utilities for masonry layout tests
 */
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import type { NodePlacement } from '../../types/masonryLayout';

/**
 * Creates a mock CanvasNode for testing
 */
export const createMockNode = (
    id: string,
    overrides?: Partial<CanvasNode>
): CanvasNode => ({
    id,
    workspaceId: 'ws-test',
    type: 'idea',
    position: { x: 0, y: 0 },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    data: { heading: '', output: '' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

/**
 * Creates a mock NodePlacement for testing
 */
export const createMockPlacement = (
    id: string,
    column: number,
    x: number,
    y: number,
    width = DEFAULT_NODE_WIDTH,
    height = DEFAULT_NODE_HEIGHT
): NodePlacement => ({
    node: createMockNode(id, { width, height, position: { x, y } }),
    column,
    x,
    y,
    width,
    height,
});
