/**
 * documentCounting.test.ts — Tests for document-based counting and batch delete
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ id: 'mock-doc' })),
    setDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn(),
    collection: vi.fn(() => ({ id: 'mock-col' })),
    serverTimestamp: vi.fn(() => 'mock-ts'),
    getCountFromServer: vi.fn(),
    query: vi.fn((...args: unknown[]) => args[0]),
    where: vi.fn(),
    writeBatch: vi.fn(() => ({
        delete: vi.fn(),
        commit: vi.fn(),
    })),
}));

vi.mock('@/config/firebase', () => ({
    db: {},
}));

vi.mock('@/shared/localization/strings', () => ({
    strings: {
        knowledgeBank: {
            errors: {
                titleRequired: 'Title is required',
                contentTooLarge: 'Content too large',
                maxEntries: 'Maximum of 25 documents reached',
            },
        },
    },
}));

vi.mock('../../utils/sanitizer', () => ({
    sanitizeContent: (s: string) => s,
}));

import { getCountFromServer, query, where, writeBatch, doc } from 'firebase/firestore';
import {
    getServerDocumentCount,
    deleteKBEntryBatch,
    addKBEntry,
} from '../../services/knowledgeBankService';

const mockGetCount = vi.mocked(getCountFromServer);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockWriteBatch = vi.mocked(writeBatch);
const mockDoc = vi.mocked(doc);

describe('getServerDocumentCount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('queries for entries with parentEntryId == null', async () => {
        mockGetCount.mockResolvedValue({ data: () => ({ count: 5 }) } as never);
        mockWhere.mockReturnValue('where-clause' as never);
        mockQuery.mockReturnValue('query-result' as never);

        const count = await getServerDocumentCount('user1', 'ws1');

        expect(mockWhere).toHaveBeenCalledWith('parentEntryId', '==', null);
        expect(count).toBe(5);
    });
});

describe('deleteKBEntryBatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deletes multiple entries atomically via writeBatch', async () => {
        const mockBatchDelete = vi.fn();
        const mockBatchCommit = vi.fn();
        mockWriteBatch.mockReturnValue({
            delete: mockBatchDelete,
            commit: mockBatchCommit,
        } as never);
        mockDoc.mockReturnValue({ id: 'mock' } as never);

        await deleteKBEntryBatch('user1', 'ws1', ['e1', 'e2', 'e3']);

        expect(mockBatchDelete).toHaveBeenCalledTimes(3);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('handles empty entry list gracefully', async () => {
        const mockBatchCommit = vi.fn();
        mockWriteBatch.mockReturnValue({
            delete: vi.fn(),
            commit: mockBatchCommit,
        } as never);

        await deleteKBEntryBatch('user1', 'ws1', []);

        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
});

describe('addKBEntry document limit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects new document when at KB_MAX_DOCUMENTS limit', async () => {
        mockGetCount.mockResolvedValue({ data: () => ({ count: 25 }) } as never);
        mockWhere.mockReturnValue('where-clause' as never);
        mockQuery.mockReturnValue('query-result' as never);

        await expect(
            addKBEntry('user1', 'ws1', {
                type: 'document', title: 'Test', content: 'content',
            })
        ).rejects.toThrow('Maximum of 25 documents reached');
    });

    it('allows chunk children to bypass the document limit', async () => {
        mockGetCount.mockResolvedValue({ data: () => ({ count: 25 }) } as never);
        mockWhere.mockReturnValue('where-clause' as never);
        mockQuery.mockReturnValue('query-result' as never);

        const entry = await addKBEntry('user1', 'ws1', {
            type: 'document', title: 'Chunk', content: 'content',
            parentEntryId: 'parent-1',
        });

        expect(entry.parentEntryId).toBe('parent-1');
    });
});
