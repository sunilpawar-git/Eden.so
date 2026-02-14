/**
 * Knowledge Bank Service Tests
 * TDD: Tests for Firestore CRUD (mocked)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase before imports
vi.mock('@/config/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('../utils/sanitizer', () => ({
    sanitizeContent: (s: string) => s, // pass-through in tests
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { addKBEntry, updateKBEntry, deleteKBEntry, loadKBEntries } from '../services/knowledgeBankService';
// eslint-disable-next-line import-x/first
import { setDoc, getDocs, deleteDoc } from 'firebase/firestore';
// eslint-disable-next-line import-x/first
import type { KnowledgeBankEntryInput } from '../types/knowledgeBank';

describe('knowledgeBankService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validInput: KnowledgeBankEntryInput = {
        type: 'text',
        title: 'Test Entry',
        content: 'Some test content',
    };

    describe('addKBEntry', () => {
        it('creates entry and calls setDoc', async () => {
            const entry = await addKBEntry('user-1', 'ws-1', validInput);
            expect(entry.title).toBe('Test Entry');
            expect(entry.content).toBe('Some test content');
            expect(entry.type).toBe('text');
            expect(entry.enabled).toBe(true);
            expect(entry.id).toMatch(/^kb-/);
            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it('rejects empty title', async () => {
            await expect(
                addKBEntry('user-1', 'ws-1', { ...validInput, title: '  ' })
            ).rejects.toThrow();
        });

        it('rejects oversized content', async () => {
            const bigContent = 'x'.repeat(10_001);
            await expect(
                addKBEntry('user-1', 'ws-1', { ...validInput, content: bigContent })
            ).rejects.toThrow();
        });

        it('rejects when max entries reached', async () => {
            // Mock 20 existing entries
            const mockDocs = Array.from({ length: 20 }, (_, i) => ({
                data: () => ({ id: `kb-${i}`, type: 'text', title: `E${i}`, content: '', enabled: true }),
            }));
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs } as never);

            await expect(
                addKBEntry('user-1', 'ws-1', validInput)
            ).rejects.toThrow();
        });
    });

    describe('updateKBEntry', () => {
        it('calls setDoc with merge', async () => {
            await updateKBEntry('user-1', 'ws-1', 'kb-1', { title: 'Updated' });
            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it('rejects empty title update', async () => {
            await expect(
                updateKBEntry('user-1', 'ws-1', 'kb-1', { title: '' })
            ).rejects.toThrow();
        });

        it('rejects oversized content update', async () => {
            const bigContent = 'x'.repeat(10_001);
            await expect(
                updateKBEntry('user-1', 'ws-1', 'kb-1', { content: bigContent })
            ).rejects.toThrow();
        });
    });

    describe('deleteKBEntry', () => {
        it('calls deleteDoc', async () => {
            await deleteKBEntry('user-1', 'ws-1', 'kb-1');
            expect(deleteDoc).toHaveBeenCalledTimes(1);
        });
    });

    describe('loadKBEntries', () => {
        it('returns empty array when no entries', async () => {
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as never);
            const entries = await loadKBEntries('user-1', 'ws-1');
            expect(entries).toEqual([]);
        });

        it('maps Firestore docs to KnowledgeBankEntry', async () => {
            const mockDocs = [{
                id: 'kb-1',
                data: () => ({
                    type: 'text', title: 'Test',
                    content: 'Content', enabled: true,
                    createdAt: { toDate: () => new Date('2026-01-01') },
                    updatedAt: { toDate: () => new Date('2026-01-02') },
                }),
            }];
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs } as never);

            const entries = await loadKBEntries('user-1', 'ws-1');
            expect(entries).toHaveLength(1);
            expect(entries[0]!.id).toBe('kb-1');
            expect(entries[0]!.title).toBe('Test');
            expect(entries[0]!.workspaceId).toBe('ws-1');
        });
    });
});
