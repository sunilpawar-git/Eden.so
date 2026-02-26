/**
 * Tests for workspaceSwitchHelpers — loadWorkspaceKB
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWorkspaceKB } from '../workspaceSwitchHelpers';

const mockLoadKBEntries = vi.fn();
const mockSetEntries = vi.fn();

vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: (...args: unknown[]) => mockLoadKBEntries(...args),
}));
vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: () => ({ setEntries: mockSetEntries }),
    },
}));

describe('loadWorkspaceKB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadKBEntries.mockResolvedValue([]);
    });

    it('loads KB entries and sets them in the store', async () => {
        const entries = [
            { id: 'e1', title: 'Note', content: 'Text', type: 'text' as const, enabled: true },
        ];
        mockLoadKBEntries.mockResolvedValue(entries);

        await loadWorkspaceKB('user-1', 'ws-1');

        expect(mockLoadKBEntries).toHaveBeenCalledWith('user-1', 'ws-1');
        expect(mockSetEntries).toHaveBeenCalledWith(entries);
    });

    it('handles empty entries array', async () => {
        mockLoadKBEntries.mockResolvedValue([]);

        await loadWorkspaceKB('user-2', 'ws-2');

        expect(mockLoadKBEntries).toHaveBeenCalledWith('user-2', 'ws-2');
        expect(mockSetEntries).toHaveBeenCalledWith([]);
    });

    it('does not throw when loadKBEntries rejects', async () => {
        mockLoadKBEntries.mockRejectedValue(new Error('Firestore permission denied'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(loadWorkspaceKB('user-1', 'ws-1')).resolves.toBeUndefined();

        expect(mockSetEntries).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[loadWorkspaceKB]'),
            expect.anything()
        );
        consoleSpy.mockRestore();
    });

    it('does not call setEntries when load fails', async () => {
        mockLoadKBEntries.mockRejectedValue(new Error('Network error'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await loadWorkspaceKB('user-1', 'ws-1');

        expect(mockSetEntries).not.toHaveBeenCalled();
    });

    it('passes userId and workspaceId to loadKBEntries', async () => {
        await loadWorkspaceKB('custom-user-id', 'custom-ws-id');

        expect(mockLoadKBEntries).toHaveBeenCalledTimes(1);
        expect(mockLoadKBEntries).toHaveBeenCalledWith('custom-user-id', 'custom-ws-id');
    });
});
