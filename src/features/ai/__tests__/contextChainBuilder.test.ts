/**
 * Tests for contextChainBuilder — buildContextChain
 */
import { describe, it, expect } from 'vitest';
import { buildContextChain } from '../services/contextChainBuilder';
import type { CanvasNode } from '@/features/canvas/types/node';

const createMockNode = (
    id: string,
    data: { heading?: string; prompt?: string; output?: string }
): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('buildContextChain', () => {
    it('returns empty array for empty upstream nodes', () => {
        const result = buildContextChain([]);
        expect(result).toEqual([]);
    });

    it('filters out nodes with no meaningful content', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: '' }),
            createMockNode('n2', { heading: '   ', prompt: undefined, output: undefined }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual([]);
    });

    it('includes nodes with heading only', () => {
        const nodes = [
            createMockNode('n1', { heading: 'Title', prompt: '', output: '' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Title']);
    });

    it('includes nodes with output only', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: 'Content' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Content']);
    });

    it('includes nodes with prompt only', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Ask AI', output: undefined }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Ask AI']);
    });

    it('combines heading and content with double newline when both present', () => {
        const nodes = [
            createMockNode('n1', { heading: 'Section', prompt: '', output: 'Body text' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Section\n\nBody text']);
    });

    it('reverses upstream order so closest-first becomes context order', () => {
        const nodes = [
            createMockNode('n1', { heading: 'First', prompt: '', output: '' }),
            createMockNode('n2', { heading: 'Second', prompt: '', output: '' }),
            createMockNode('n3', { heading: 'Third', prompt: '', output: '' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Third', 'Second', 'First']);
    });

    it('trims heading whitespace', () => {
        const nodes = [
            createMockNode('n1', { heading: '  Trimmed  ', prompt: '', output: '' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Trimmed']);
    });

    it('prefers output over prompt when both present', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Prompt', output: 'Output' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Output']);
    });

    it('uses prompt when output is undefined', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Legacy prompt', output: undefined }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Legacy prompt']);
    });

    it('returns content when heading is empty string', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: 'Only content' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['Only content']);
    });

    it('filters mixed array and keeps only nodes with content', () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: '' }),
            createMockNode('n2', { heading: 'Keep', prompt: '', output: '' }),
            createMockNode('n3', { heading: '', prompt: '', output: 'Also keep' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toHaveLength(2);
        expect(result).toContain('Keep');
        expect(result).toContain('Also keep');
    });

    it('produces correct order for multi-node chain with heading and content', () => {
        const nodes = [
            createMockNode('n1', { heading: 'A', prompt: '', output: 'Content A' }),
            createMockNode('n2', { heading: 'B', prompt: '', output: 'Content B' }),
        ];
        const result = buildContextChain(nodes);
        expect(result).toEqual(['B\n\nContent B', 'A\n\nContent A']);
    });
});
