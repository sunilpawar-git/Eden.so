/**
 * SummarizeEntries Tests — Background summarization orchestrator
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeEntries } from '../../services/summarizeEntries';
import { useKnowledgeBankStore } from '../../stores/knowledgeBankStore';
import { KB_SUMMARY_THRESHOLD } from '../../types/knowledgeBank';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

// Mock summarization service
vi.mock('../../services/summarizationService', () => ({
    shouldSummarize: vi.fn((content: string) => content.length > 500),
    summarizeContent: vi.fn().mockResolvedValue('AI-generated summary'),
}));

// Mock Firebase service
vi.mock('../../services/knowledgeBankService', () => ({
    updateKBEntry: vi.fn().mockResolvedValue(undefined),
}));

// Mock Firebase
vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(), doc: vi.fn(), setDoc: vi.fn(),
    getDocs: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: vi.fn(),
}));

const { summarizeContent } = await import('../../services/summarizationService');
const { updateKBEntry } = await import('../../services/knowledgeBankService');

function mockEntry(overrides: Partial<KnowledgeBankEntry>): KnowledgeBankEntry {
    return {
        id: 'kb-1',
        workspaceId: 'ws-1',
        type: 'text',
        title: 'Entry',
        content: 'Short',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('summarizeEntries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useKnowledgeBankStore.setState({
            entries: [],
            isPanelOpen: false,
            searchQuery: '',
            typeFilter: 'all',
        });
    });

    it('skips entries below threshold', async () => {
        const entry = mockEntry({ content: 'Short text' });
        await summarizeEntries('user-1', 'ws-1', [entry]);

        expect(summarizeContent).not.toHaveBeenCalled();
    });

    it('summarizes entries above threshold', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-long', content: longContent });

        useKnowledgeBankStore.getState().addEntry(entry);
        await summarizeEntries('user-1', 'ws-1', [entry]);

        expect(summarizeContent).toHaveBeenCalledWith(longContent);
    });

    it('calls onEntryDone callback with summary', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-long', content: longContent });

        const onEntryDone = vi.fn();
        useKnowledgeBankStore.getState().addEntry(entry);
        await summarizeEntries('user-1', 'ws-1', [entry], { onEntryDone });

        expect(onEntryDone).toHaveBeenCalledWith('kb-long', 'AI-generated summary');
    });

    it('persists summary to Firestore', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-long', content: longContent });

        useKnowledgeBankStore.getState().addEntry(entry);
        await summarizeEntries('user-1', 'ws-1', [entry]);

        expect(updateKBEntry).toHaveBeenCalledWith(
            'user-1', 'ws-1', 'kb-long', { summary: 'AI-generated summary' }
        );
    });

    it('handles multiple entries in parallel', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entries = [
            mockEntry({ id: 'kb-1', content: longContent }),
            mockEntry({ id: 'kb-2', content: longContent }),
            mockEntry({ id: 'kb-3', content: 'Short' }),
        ];

        for (const e of entries) useKnowledgeBankStore.getState().addEntry(e);
        await summarizeEntries('user-1', 'ws-1', entries);

        // Only 2 entries exceed threshold
        expect(summarizeContent).toHaveBeenCalledTimes(2);
    });

    it('persists to Firestore before calling onEntryDone', async () => {
        const callOrder: string[] = [];
        vi.mocked(updateKBEntry).mockImplementation(async () => {
            callOrder.push('firestore');
        });
        const onEntryDone = vi.fn(() => { callOrder.push('store'); });

        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-order', content: longContent });
        useKnowledgeBankStore.getState().addEntry(entry);

        await summarizeEntries('user-1', 'ws-1', [entry], { onEntryDone });

        expect(callOrder).toEqual(['firestore', 'store']);
    });

    it('does not call onEntryDone when Firestore fails', async () => {
        vi.mocked(updateKBEntry).mockRejectedValueOnce(new Error('Firestore down'));
        const onEntryDone = vi.fn();

        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-fail-fs', content: longContent });
        useKnowledgeBankStore.getState().addEntry(entry);

        await summarizeEntries('user-1', 'ws-1', [entry], { onEntryDone });

        expect(onEntryDone).not.toHaveBeenCalled();
    });

    it('calls onStart with entry IDs that will be summarized', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entries = [
            mockEntry({ id: 'kb-a', content: longContent }),
            mockEntry({ id: 'kb-b', content: 'Short' }),
            mockEntry({ id: 'kb-c', content: longContent }),
        ];
        for (const e of entries) useKnowledgeBankStore.getState().addEntry(e);

        const onStart = vi.fn();
        await summarizeEntries('user-1', 'ws-1', entries, { onStart });

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onStart).toHaveBeenCalledWith(['kb-a', 'kb-c']);
    });

    it('calls onComplete with results map', async () => {
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-done', content: longContent });
        useKnowledgeBankStore.getState().addEntry(entry);

        const onComplete = vi.fn();
        await summarizeEntries('user-1', 'ws-1', [entry], { onComplete });

        expect(onComplete).toHaveBeenCalledTimes(1);
        const results = onComplete.mock.calls[0]![0] as Record<string, string>;
        expect(results['kb-done']).toBe('success');
    });

    it('reports failed in results when Firestore fails', async () => {
        vi.mocked(updateKBEntry).mockRejectedValueOnce(new Error('fail'));
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-err', content: longContent });
        useKnowledgeBankStore.getState().addEntry(entry);

        const onComplete = vi.fn();
        await summarizeEntries('user-1', 'ws-1', [entry], { onComplete });

        const results = onComplete.mock.calls[0]![0] as Record<string, string>;
        expect(results['kb-err']).toBe('failed');
    });

    it('reports skipped in results when summary is null', async () => {
        vi.mocked(summarizeContent).mockResolvedValueOnce(null);
        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-skip', content: longContent });
        useKnowledgeBankStore.getState().addEntry(entry);

        const onComplete = vi.fn();
        await summarizeEntries('user-1', 'ws-1', [entry], { onComplete });

        const results = onComplete.mock.calls[0]![0] as Record<string, string>;
        expect(results['kb-skip']).toBe('skipped');
    });

    it('does not call onStart when no entries need summarization', async () => {
        const entry = mockEntry({ content: 'Short' });
        const onStart = vi.fn();
        await summarizeEntries('user-1', 'ws-1', [entry], { onStart });

        expect(onStart).not.toHaveBeenCalled();
    });

    it('does not throw on summarization failure', async () => {
        vi.mocked(summarizeContent).mockResolvedValueOnce(null);

        const longContent = 'x'.repeat(KB_SUMMARY_THRESHOLD + 100);
        const entry = mockEntry({ id: 'kb-fail', content: longContent });

        useKnowledgeBankStore.getState().addEntry(entry);

        // Should not throw
        await expect(
            summarizeEntries('user-1', 'ws-1', [entry])
        ).resolves.toBeUndefined();

        // Store should not be updated when summary is null
        const updated = useKnowledgeBankStore.getState().entries[0];
        expect(updated?.summary).toBeUndefined();
    });
});
