/**
 * Node Type Tests - Unit tests for node creation functions
 */
import { describe, it, expect } from 'vitest';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../node';

describe('createIdeaNode', () => {
    const testId = 'test-node-1';
    const testWorkspaceId = 'test-workspace';
    const testPosition = { x: 100, y: 200 };

    it('should return node with default width', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);

        expect(node.width).toBe(DEFAULT_NODE_WIDTH);
    });

    it('should return node with default height', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);

        expect(node.height).toBe(DEFAULT_NODE_HEIGHT);
    });

    it('should create node with correct basic properties', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition, 'test prompt');

        expect(node.id).toBe(testId);
        expect(node.workspaceId).toBe(testWorkspaceId);
        expect(node.type).toBe('idea');
        expect(node.position).toEqual(testPosition);
        expect(node.data.prompt).toBe('test prompt');
    });

    it('should set empty prompt when not provided', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);

        expect(node.data.prompt).toBe('');
    });

    it('should set createdAt and updatedAt timestamps', () => {
        const beforeCreate = new Date();
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);
        const afterCreate = new Date();

        expect(node.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(node.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        expect(node.updatedAt).toEqual(node.createdAt);
    });
});
