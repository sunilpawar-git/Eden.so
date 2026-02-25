/**
 * NodeUtilsBar Share integration tests — ShareMenu renders inside overflow menu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

const openOverflow = () => fireEvent.click(screen.getByLabelText('More actions'));

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

    it('renders ShareMenu inside overflow when onShareClick is provided', () => {
        const onShareClick = vi.fn().mockResolvedValue(undefined);
        render(<NodeUtilsBar {...baseProps} onShareClick={onShareClick} />);
        openOverflow();
        expect(screen.getByLabelText('Share')).toBeInTheDocument();
    });

    it('does not render ShareMenu when onShareClick is not provided', () => {
        render(<NodeUtilsBar {...baseProps} />);
        openOverflow();
        expect(screen.queryByLabelText('Share')).not.toBeInTheDocument();
    });

    it('passes isSharing prop to ShareMenu — Share button is disabled', () => {
        const onShareClick = vi.fn().mockResolvedValue(undefined);
        render(<NodeUtilsBar {...baseProps} onShareClick={onShareClick} isSharing />);
        openOverflow();
        expect(screen.getByLabelText('Share')).toBeDisabled();
    });
});
