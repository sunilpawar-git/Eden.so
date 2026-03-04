/**
 * nodePoolBuilder — attachment enrichment tests
 * Validates that attachment parsed text is fetched and appended to pool entries
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock attachment text cache to avoid network calls in unit tests
vi.mock('../attachmentTextCache', () => ({
    attachmentTextCache: {
        getText: vi.fn().mockResolvedValue('PDF content from attachment'),
    },
}));

/* eslint-disable import-x/first */
import { enrichEntryWithAttachments, buildPoolEntriesWithAttachments } from '../nodePoolBuilder';
import { attachmentTextCache } from '../attachmentTextCache';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { NodePoolEntry } from '../../types/nodePool';
/* eslint-enable import-x/first */

const mockGetText = vi.mocked(attachmentTextCache.getText);

function makeNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws1',
        type: 'idea',
        data: { heading: 'Test', output: 'Content', ...overrides },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeEntry(id: string, content: string): NodePoolEntry {
    return { id, title: 'Test', content, tags: [] };
}

describe('enrichEntryWithAttachments', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns entry unchanged when node has no attachments', async () => {
        const node = makeNode('n1');
        const entry = makeEntry('n1', 'Original content');
        const result = await enrichEntryWithAttachments(node, entry);

        expect(result).toBe(entry); // Same reference — no modification
        expect(mockGetText).not.toHaveBeenCalled();
    });

    it('returns entry unchanged when attachments array is empty', async () => {
        const node = makeNode('n1', { attachments: [] });
        const entry = makeEntry('n1', 'Content');
        const result = await enrichEntryWithAttachments(node, entry);

        expect(result).toBe(entry);
    });

    it('appends attachment text to entry content', async () => {
        const node = makeNode('n1', {
            attachments: [{
                filename: 'report.pdf', url: 'https://cdn.example.com/a.pdf',
                parsedTextUrl: 'https://cdn.example.com/a.txt',
                mimeType: 'application/pdf', sizeBytes: 1024,
            }],
        });
        const entry = makeEntry('n1', 'Node content');
        const result = await enrichEntryWithAttachments(node, entry);

        expect(result.content).toContain('Node content');
        expect(result.content).toContain('[Attachment]');
        expect(result.content).toContain('PDF content from attachment');
        expect(mockGetText).toHaveBeenCalledWith('https://cdn.example.com/a.txt');
    });

    it('skips attachments without parsedTextUrl', async () => {
        const node = makeNode('n1', {
            attachments: [{
                filename: 'img.pdf', url: 'https://cdn.example.com/b.pdf',
                mimeType: 'application/pdf', sizeBytes: 512,
            }],
        });
        const entry = makeEntry('n1', 'Content');
        const result = await enrichEntryWithAttachments(node, entry);

        expect(result).toBe(entry); // No parsedTextUrl → no fetch → unchanged
        expect(mockGetText).not.toHaveBeenCalled();
    });

    it('uses [Attachment] label as content when entry has no original content', async () => {
        const node = makeNode('n1', {
            attachments: [{
                filename: 'notes.txt', url: 'https://cdn.example.com/n.txt',
                parsedTextUrl: 'https://cdn.example.com/n-parsed.txt',
                mimeType: 'text/plain', sizeBytes: 200,
            }],
        });
        const entry = makeEntry('n1', '');
        const result = await enrichEntryWithAttachments(node, entry);

        expect(result.content).toMatch(/^\[Attachment\]/);
    });
});

describe('buildPoolEntriesWithAttachments', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('builds entries for all nodes and enriches those with attachments', async () => {
        const nodes = [
            makeNode('n1', {
                heading: 'Research', output: 'Findings',
                attachments: [{
                    filename: 'paper.pdf', url: 'https://cdn.example.com/p.pdf',
                    parsedTextUrl: 'https://cdn.example.com/p.txt',
                    mimeType: 'application/pdf', sizeBytes: 2048,
                }],
            }),
            makeNode('n2', { heading: 'Ideas', output: 'Brainstorm' }),
        ];

        const entries = await buildPoolEntriesWithAttachments(nodes);

        expect(entries).toHaveLength(2);
        expect(entries[0]!.content).toContain('[Attachment]');
        expect(entries[1]!.content).not.toContain('[Attachment]');
    });

    it('returns empty array for empty input', async () => {
        const entries = await buildPoolEntriesWithAttachments([]);
        expect(entries).toHaveLength(0);
    });
});
