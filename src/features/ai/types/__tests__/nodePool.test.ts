/**
 * Node Pool Types Tests — constants validation
 * TDD: tests written before implementation (types already defined)
 */
import { describe, it, expect } from 'vitest';
import { NODE_POOL_TOKEN_BUDGETS, NODE_POOL_CHARS_PER_TOKEN } from '../nodePool';
import type { NodePoolEntry, NodePoolGenerationType } from '../nodePool';

describe('NODE_POOL_TOKEN_BUDGETS', () => {
    it('defines budgets for all generation types', () => {
        const expectedKeys: NodePoolGenerationType[] = ['single', 'chain', 'transform'];
        expect(Object.keys(NODE_POOL_TOKEN_BUDGETS).sort()).toEqual(expectedKeys.sort());
    });

    it('has positive integer values for all budgets', () => {
        for (const [key, value] of Object.entries(NODE_POOL_TOKEN_BUDGETS)) {
            expect(value, `${key} budget should be a positive integer`).toBeGreaterThan(0);
            expect(Number.isInteger(value), `${key} budget should be an integer`).toBe(true);
        }
    });

    it('allocates more tokens for single than chain', () => {
        expect(NODE_POOL_TOKEN_BUDGETS.single).toBeGreaterThan(NODE_POOL_TOKEN_BUDGETS.chain);
    });

    it('allocates more tokens for chain than transform', () => {
        expect(NODE_POOL_TOKEN_BUDGETS.chain).toBeGreaterThan(NODE_POOL_TOKEN_BUDGETS.transform);
    });
});

describe('NODE_POOL_CHARS_PER_TOKEN', () => {
    it('is a positive integer', () => {
        expect(NODE_POOL_CHARS_PER_TOKEN).toBeGreaterThan(0);
        expect(Number.isInteger(NODE_POOL_CHARS_PER_TOKEN)).toBe(true);
    });
});

describe('NodePoolEntry type', () => {
    it('accepts a valid entry object', () => {
        const entry: NodePoolEntry = {
            id: 'node-1',
            title: 'Test idea',
            content: 'Some content',
            tags: ['tag1', 'tag2'],
        };
        expect(entry.id).toBe('node-1');
        expect(entry.tags).toHaveLength(2);
    });
});
