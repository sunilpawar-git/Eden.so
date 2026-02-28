/**
 * Node Type Tests - Unit tests for node creation functions
 */
import { describe, it, expect } from 'vitest';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, normalizeNodeColorKey, isNodePinned } from '../node';
import type { CanvasNode } from '../node';

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
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        expect(node.data.prompt).toBe('test prompt');
    });

    it('should omit prompt when not provided', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        expect(node.data.prompt).toBeUndefined();
    });

    it('should set createdAt and updatedAt timestamps', () => {
        const beforeCreate = new Date();
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);
        const afterCreate = new Date();

        expect(node.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(node.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        expect(node.updatedAt).toEqual(node.createdAt);
    });

    it('assigns default color key on create', () => {
        const node = createIdeaNode(testId, testWorkspaceId, testPosition);
        expect(node.data.colorKey).toBe('default');
    });
});

describe('normalizeNodeColorKey', () => {
    it('returns known keys verbatim', () => {
        expect(normalizeNodeColorKey('default')).toBe('default');
        expect(normalizeNodeColorKey('danger')).toBe('danger');
        expect(normalizeNodeColorKey('warning')).toBe('warning');
        expect(normalizeNodeColorKey('success')).toBe('success');
    });

    it('maps legacy "primary" to "danger"', () => {
        expect(normalizeNodeColorKey('primary')).toBe('danger');
    });

    it('defaults unknown and non-string values', () => {
        expect(normalizeNodeColorKey('unknown')).toBe('default');
        expect(normalizeNodeColorKey(undefined)).toBe('default');
        expect(normalizeNodeColorKey(null)).toBe('default');
        expect(normalizeNodeColorKey(42)).toBe('default');
        expect(normalizeNodeColorKey('')).toBe('default');
    });
});

describe('isNodePinned', () => {
    const makeNode = (data: Partial<CanvasNode['data']> = {}): CanvasNode => ({
        id: 'n1', workspaceId: 'ws', type: 'idea',
        data: { prompt: '', output: '', tags: [], ...data },
        position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
    });

    it('returns true when isPinned is true', () => {
        expect(isNodePinned(makeNode({ isPinned: true }))).toBe(true);
    });

    it('returns false when isPinned is false', () => {
        expect(isNodePinned(makeNode({ isPinned: false }))).toBe(false);
    });

    it('returns false when isPinned is undefined', () => {
        expect(isNodePinned(makeNode())).toBe(false);
    });

    it('returns false when data is missing (defensive)', () => {
        const malformed = { id: 'n1', data: undefined } as unknown as CanvasNode;
        expect(isNodePinned(malformed)).toBe(false);
    });

    it('returns false when data is null (defensive)', () => {
        const malformed = { id: 'n1', data: null } as unknown as CanvasNode;
        expect(isNodePinned(malformed)).toBe(false);
    });
});
