/**
 * postUploadSummarizer.test.ts — Tests for post-upload summarization orchestrator
 * Handles both individual chunk summaries and document-level summary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSummarizeEntries = vi.fn().mockResolvedValue(undefined);
const mockSummarizeDocument = vi.fn();
const mockUpdateKBEntry = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/summarizeEntries', () => ({
    summarizeEntries: (...args: unknown[]) => mockSummarizeEntries(...args),
}));

vi.mock('../../services/documentSummarizer', () => ({
    summarizeDocument: (...args: unknown[]) => mockSummarizeDocument(...args),
}));

vi.mock('../../services/knowledgeBankService', () => ({
    updateKBEntry: (...args: unknown[]) => mockUpdateKBEntry(...args),
}));

import { runPostUploadSummarization } from '../../services/postUploadSummarizer';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: 'ws-1',
        type: 'document',
        title: 'Test',
        content: 'Some content',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('runPostUploadSummarization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls summarizeEntries for all entries', async () => {
        const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
        await runPostUploadSummarization('u1', 'ws1', entries);

        expect(mockSummarizeEntries).toHaveBeenCalledTimes(1);
        expect(mockSummarizeEntries).toHaveBeenCalledWith('u1', 'ws1', entries, undefined);
    });

    it('triggers document summary for chunked docs (parent + children)', async () => {
        const parent = makeEntry({ id: 'p1', content: 'parent text' });
        const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'child1 text' });
        const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1', content: 'child2 text' });
        mockSummarizeDocument.mockResolvedValue('Document summary');

        await runPostUploadSummarization('u1', 'ws1', [parent, child1, child2]);

        expect(mockSummarizeDocument).toHaveBeenCalledTimes(1);
        const [contents, title] = mockSummarizeDocument.mock.calls[0] as [string[], string];
        expect(contents).toEqual(['parent text', 'child1 text', 'child2 text']);
        expect(title).toBe('Test');
    });

    it('skips document summary for single entries', async () => {
        const single = makeEntry({ id: 'e1' });
        await runPostUploadSummarization('u1', 'ws1', [single]);

        expect(mockSummarizeDocument).not.toHaveBeenCalled();
    });

    it('updates parent with document summary and status ready', async () => {
        const parent = makeEntry({ id: 'p1' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'child text' });
        mockSummarizeDocument.mockResolvedValue('Full doc summary');

        await runPostUploadSummarization('u1', 'ws1', [parent, child]);

        expect(mockUpdateKBEntry).toHaveBeenCalledWith('u1', 'ws1', 'p1', {
            summary: 'Full doc summary',
            documentSummaryStatus: 'ready',
        });
    });

    it('sets status to ready even when document summary fails (null)', async () => {
        const parent = makeEntry({ id: 'p1' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1' });
        mockSummarizeDocument.mockResolvedValue(null);

        await runPostUploadSummarization('u1', 'ws1', [parent, child]);

        expect(mockUpdateKBEntry).toHaveBeenCalledWith('u1', 'ws1', 'p1', {
            documentSummaryStatus: 'ready',
        });
    });

    it('passes raw content (not summaries) to summarizeDocument', async () => {
        const parent = makeEntry({ id: 'p1', content: 'raw parent', summary: 'parent summary' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'raw child', summary: 'child summary' });
        mockSummarizeDocument.mockResolvedValue('summary');

        await runPostUploadSummarization('u1', 'ws1', [parent, child]);

        const [contents] = mockSummarizeDocument.mock.calls[0] as [string[]];
        expect(contents).toEqual(['raw parent', 'raw child']);
        expect(contents).not.toContain('parent summary');
        expect(contents).not.toContain('child summary');
    });

    it('handles errors gracefully without throwing', async () => {
        const parent = makeEntry({ id: 'p1' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1' });
        mockSummarizeDocument.mockRejectedValue(new Error('API down'));

        await expect(
            runPostUploadSummarization('u1', 'ws1', [parent, child])
        ).resolves.not.toThrow();
    });
});
