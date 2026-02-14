/**
 * KnowledgeBankPanel Tests — Panel rendering and state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeBankPanel } from '../components/KnowledgeBankPanel';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

// Mock Firebase services
vi.mock('../services/knowledgeBankService', () => ({
    updateKBEntry: vi.fn(),
    deleteKBEntry: vi.fn(),
}));

vi.mock('../services/storageService', () => ({
    deleteKBFile: vi.fn(),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: { getState: () => ({ user: { id: 'user-1' } }) },
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: { getState: () => ({ currentWorkspaceId: 'ws-1' }) },
}));

const mockEntry: KnowledgeBankEntry = {
    id: 'kb-1',
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'Test content here',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('KnowledgeBankPanel', () => {
    beforeEach(() => {
        useKnowledgeBankStore.getState().clearEntries();
        useKnowledgeBankStore.getState().setPanelOpen(false);
    });

    it('renders nothing when panel is closed', () => {
        const { container } = render(<KnowledgeBankPanel />);
        expect(container.innerHTML).toBe('');
    });

    it('renders panel when open', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        render(<KnowledgeBankPanel />);
        expect(screen.getByText('Knowledge Bank')).toBeDefined();
    });

    it('shows empty state when no entries', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        render(<KnowledgeBankPanel />);
        expect(screen.getByText('No entries yet')).toBeDefined();
    });

    it('renders entry cards when entries exist', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        useKnowledgeBankStore.getState().addEntry(mockEntry);
        render(<KnowledgeBankPanel />);
        expect(screen.getByText('Test Entry')).toBeDefined();
    });

    it('closes panel when close button is clicked', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        render(<KnowledgeBankPanel />);

        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);
        expect(useKnowledgeBankStore.getState().isPanelOpen).toBe(false);
    });

    it('toggles entry in store when toggle is clicked', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        useKnowledgeBankStore.getState().addEntry(mockEntry);
        render(<KnowledgeBankPanel />);
        const toggle = screen.getByLabelText('Toggle entry enabled');
        fireEvent.click(toggle);

        const entry = useKnowledgeBankStore.getState().entries[0]!;
        expect(entry.enabled).toBe(false);
    });

    it('renders multiple entries', () => {
        useKnowledgeBankStore.getState().setPanelOpen(true);
        useKnowledgeBankStore.getState().addEntry(mockEntry);
        useKnowledgeBankStore.getState().addEntry({
            ...mockEntry,
            id: 'kb-2',
            title: 'Second Entry',
        });
        render(<KnowledgeBankPanel />);
        expect(screen.getByText('Test Entry')).toBeDefined();
        expect(screen.getByText('Second Entry')).toBeDefined();
    });
});
