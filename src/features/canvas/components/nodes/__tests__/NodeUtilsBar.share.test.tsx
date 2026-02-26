/**
 * NodeUtilsBar Share integration tests — Share deck button + ShareMenu in overflow.
 * Share is a direct deck 2 button. The ShareMenu sub-menu opens inside overflow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

vi.mock('../../../../hooks/useUtilsBarLayout', () => ({
    useUtilsBarLayout: () => ({
        deckOneActions: ['ai', 'connect', 'copy', 'pin', 'delete'],
        deckTwoActions: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
    }),
}));

describe('NodeUtilsBar — ShareMenu integration', () => {
    const baseProps = {
        onTagClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
    };

    beforeEach(() => {
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [
                { id: 'ws-1', userId: 'u', name: 'WS1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date(), type: 'workspace' as const },
                { id: 'ws-2', userId: 'u', name: 'WS2', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date(), type: 'workspace' as const },
            ],
        });
    });

    it('renders Share button directly when onShareClick is provided', () => {
        const onShareClick = vi.fn().mockResolvedValue(undefined);
        render(<NodeUtilsBar {...baseProps} onShareClick={onShareClick} />);
        expect(screen.getByLabelText('Share')).toBeInTheDocument();
    });

    it('does not render Share when onShareClick is not provided', () => {
        render(<NodeUtilsBar {...baseProps} />);
        expect(screen.queryByLabelText('Share')).not.toBeInTheDocument();
    });

    it('overflow menu contains ShareMenu sub-menu when onShareClick is provided', () => {
        const onShareClick = vi.fn().mockResolvedValue(undefined);
        render(<NodeUtilsBar {...baseProps} onShareClick={onShareClick} />);
        fireEvent.click(screen.getByLabelText('More actions'));
        const shareElements = screen.getAllByLabelText('Share');
        expect(shareElements.length).toBeGreaterThanOrEqual(2);
    });
});
