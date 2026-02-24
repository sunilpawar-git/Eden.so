/**
 * ShareMenu tests — workspace selection dropdown for cross-workspace sharing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareMenu } from '../ShareMenu';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { Workspace } from '@/features/workspace/types/workspace';

const makeWorkspace = (id: string, name: string, type: 'workspace' | 'divider' = 'workspace'): Workspace => ({
    id,
    userId: 'user-1',
    name,
    canvasSettings: { backgroundColor: 'grid' },
    createdAt: new Date(),
    updatedAt: new Date(),
    type,
});

const setupStore = (currentId: string, workspaces: Workspace[]) => {
    useWorkspaceStore.setState({ currentWorkspaceId: currentId, workspaces });
};

describe('ShareMenu', () => {
    const onShare = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
        setupStore('ws-1', [
            makeWorkspace('ws-1', 'Workspace 1'),
            makeWorkspace('ws-2', 'Workspace 2'),
            makeWorkspace('ws-3', 'Workspace 3'),
            makeWorkspace('divider-1', '---', 'divider'),
        ]);
    });

    it('renders share button with 📤 icon', () => {
        render(<ShareMenu onShare={onShare} />);
        const button = screen.getByLabelText('Share');
        expect(button).toBeInTheDocument();
        expect(button.textContent).toContain('📤');
    });

    it('opens menu on click', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.getByTestId('share-menu-portal')).toBeInTheDocument();
    });

    it('closes menu on second click', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('filters out current workspace from list', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByText('Workspace 1')).not.toBeInTheDocument();
        expect(screen.getByText('Workspace 2')).toBeInTheDocument();
        expect(screen.getByText('Workspace 3')).toBeInTheDocument();
    });

    it('filters out dividers from list', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByText('---')).not.toBeInTheDocument();
    });

    it('shows empty message when no other workspaces', () => {
        setupStore('ws-1', [makeWorkspace('ws-1', 'Only one')]);
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.getByText('No other workspaces available')).toBeInTheDocument();
    });

    it('calls onShare with workspace ID when item clicked', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByText('Workspace 2'));
        expect(onShare).toHaveBeenCalledWith('ws-2');
    });

    it('closes menu after selecting a workspace', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByText('Workspace 2'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('closes menu on Escape key', () => {
        render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.getByTestId('share-menu-portal')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables button when disabled prop is true', () => {
        render(<ShareMenu onShare={onShare} disabled />);
        expect(screen.getByLabelText('Share')).toBeDisabled();
    });

    it('does not open menu when disabled', () => {
        render(<ShareMenu onShare={onShare} disabled />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables button during sharing', () => {
        render(<ShareMenu onShare={onShare} isSharing />);
        expect(screen.getByLabelText('Share')).toBeDisabled();
    });

    it('does not open menu during sharing', () => {
        render(<ShareMenu onShare={onShare} isSharing />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables menu items when isSharing is true', () => {
        const { rerender } = render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        rerender(<ShareMenu onShare={onShare} isSharing />);
        const items = screen.getAllByRole('menuitem');
        items.forEach((item) => expect(item).toBeDisabled());
    });

    it('sets aria-busy on menu when sharing', () => {
        const { rerender } = render(<ShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        rerender(<ShareMenu onShare={onShare} isSharing />);
        expect(screen.getByTestId('share-menu-portal')).toHaveAttribute('aria-busy', 'true');
    });
});
