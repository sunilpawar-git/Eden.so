/**
 * Tests for contextChainBuilder — buildContextChain
 */
import { describe, it, expect, vi } from 'vitest';
import { buildContextChain } from '../services/contextChainBuilder';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('../services/attachmentTextCache', () => ({
    attachmentTextCache: { getText: vi.fn(async () => '') },
}));

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
    it('returns empty array for empty upstream nodes', async () => {
        const result = await buildContextChain([]);
        expect(result).toEqual([]);
    });

    it('filters out nodes with no meaningful content', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: '' }),
            createMockNode('n2', { heading: '   ', prompt: undefined, output: undefined }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual([]);
    });

    it('includes nodes with heading only', async () => {
        const nodes = [
            createMockNode('n1', { heading: 'Title', prompt: '', output: '' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Title']);
    });

    it('includes nodes with output only', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: 'Content' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Content']);
    });

    it('includes nodes with prompt only', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Ask AI', output: undefined }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Ask AI']);
    });

    it('combines heading and content with double newline when both present', async () => {
        const nodes = [
            createMockNode('n1', { heading: 'Section', prompt: '', output: 'Body text' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Section\n\nBody text']);
    });

    it('reverses upstream order so closest-first becomes context order', async () => {
        const nodes = [
            createMockNode('n1', { heading: 'First', prompt: '', output: '' }),
            createMockNode('n2', { heading: 'Second', prompt: '', output: '' }),
            createMockNode('n3', { heading: 'Third', prompt: '', output: '' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Third', 'Second', 'First']);
    });

    it('trims heading whitespace', async () => {
        const nodes = [
            createMockNode('n1', { heading: '  Trimmed  ', prompt: '', output: '' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Trimmed']);
    });

    it('prefers output over prompt when both present', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Prompt', output: 'Output' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Output']);
    });

    it('uses prompt when output is undefined', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: 'Legacy prompt', output: undefined }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Legacy prompt']);
    });

    it('returns content when heading is empty string', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: 'Only content' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['Only content']);
    });

    it('filters mixed array and keeps only nodes with content', async () => {
        const nodes = [
            createMockNode('n1', { heading: '', prompt: '', output: '' }),
            createMockNode('n2', { heading: 'Keep', prompt: '', output: '' }),
            createMockNode('n3', { heading: '', prompt: '', output: 'Also keep' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toHaveLength(2);
        expect(result).toContain('Keep');
        expect(result).toContain('Also keep');
    });

    it('produces correct order for multi-node chain with heading and content', async () => {
        const nodes = [
            createMockNode('n1', { heading: 'A', prompt: '', output: 'Content A' }),
            createMockNode('n2', { heading: 'B', prompt: '', output: 'Content B' }),
        ];
        const result = await buildContextChain(nodes);
        expect(result).toEqual(['B\n\nContent B', 'A\n\nContent A']);
    });

    it('appends attachment text when node has parsed attachments', async () => {
        const { attachmentTextCache } = await import('../services/attachmentTextCache');
        vi.mocked(attachmentTextCache.getText).mockResolvedValueOnce('Extracted PDF content here');

        const node = createMockNode('n1', { heading: 'PDF Upload' });
        node.data.attachments = [{
            filename: 'doc.pdf', url: 'https://storage/doc.pdf',
            parsedTextUrl: 'https://storage/doc.pdf.parsed.txt',
            mimeType: 'application/pdf', sizeBytes: 1000,
        }];

        const result = await buildContextChain([node]);
        expect(result).toEqual(['PDF Upload\n\n[Attached Document]\nExtracted PDF content here']);
    });
});
