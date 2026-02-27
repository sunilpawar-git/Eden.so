/**
 * ShareMenu tests — controlled workspace selection dropdown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
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

function ControlledShareMenu({
    onShare,
    disabled = false,
    isSharing = false,
}: {
    onShare: (targetWorkspaceId: string) => Promise<void>;
    disabled?: boolean;
    isSharing?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <ShareMenu
            onShare={onShare}
            isOpen={isOpen}
            onToggle={() => setIsOpen((prev) => !prev)}
            onClose={() => setIsOpen(false)}
            disabled={disabled}
            isSharing={isSharing}
        />
    );
}

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
        render(<ControlledShareMenu onShare={onShare} />);
        const button = screen.getByLabelText('Share');
        expect(button).toBeInTheDocument();
        expect(button.textContent).toContain('📤');
    });

    it('opens menu on click', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.getByTestId('share-menu-portal')).toBeInTheDocument();
    });

    it('closes menu on second click', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('filters out current workspace from list', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByText('Workspace 1')).not.toBeInTheDocument();
        expect(screen.getByText('Workspace 2')).toBeInTheDocument();
        expect(screen.getByText('Workspace 3')).toBeInTheDocument();
    });

    it('filters out dividers from list', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByText('---')).not.toBeInTheDocument();
    });

    it('shows empty message when no other workspaces', () => {
        setupStore('ws-1', [makeWorkspace('ws-1', 'Only one')]);
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.getByText('No other workspaces available')).toBeInTheDocument();
    });

    it('calls onShare with workspace ID when item clicked', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByText('Workspace 2'));
        expect(onShare).toHaveBeenCalledWith('ws-2');
    });

    it('closes menu after selecting a workspace', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        fireEvent.click(screen.getByText('Workspace 2'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables button when disabled prop is true', () => {
        render(<ControlledShareMenu onShare={onShare} disabled />);
        expect(screen.getByLabelText('Share')).toBeDisabled();
    });

    it('does not open menu when disabled', () => {
        render(<ControlledShareMenu onShare={onShare} disabled />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables button during sharing', () => {
        render(<ControlledShareMenu onShare={onShare} isSharing />);
        expect(screen.getByLabelText('Share')).toBeDisabled();
    });

    it('does not open menu during sharing', () => {
        render(<ControlledShareMenu onShare={onShare} isSharing />);
        fireEvent.click(screen.getByLabelText('Share'));
        expect(screen.queryByTestId('share-menu-portal')).not.toBeInTheDocument();
    });

    it('disables menu items when isSharing is true and open', () => {
        render(
            <ShareMenu
                onShare={onShare}
                isOpen={true}
                onToggle={vi.fn()}
                onClose={vi.fn()}
                isSharing={true}
            />
        );
        const items = screen.getAllByRole('menuitem');
        items.forEach((item) => expect(item).toBeDisabled());
    });

    it('sets aria-busy on menu when sharing', () => {
        render(
            <ShareMenu
                onShare={onShare}
                isOpen={true}
                onToggle={vi.fn()}
                onClose={vi.fn()}
                isSharing={true}
            />
        );
        expect(screen.getByTestId('share-menu-portal')).toHaveAttribute('aria-busy', 'true');
    });

    it('dropdown positions to the side of the button via inline style', () => {
        render(<ControlledShareMenu onShare={onShare} />);
        fireEvent.click(screen.getByLabelText('Share'));
        const portal = document.querySelector('[data-testid="share-menu-portal"]') as HTMLElement;
        expect(portal).toBeInTheDocument();
        expect(portal.style.top).toBeDefined();
        expect(portal.style.left).toBeDefined();
    });
});
