import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceItem } from '../WorkspaceItem';

// Mock PinWorkspaceButton to avoid complex dependencies
vi.mock('@/features/workspace/components/PinWorkspaceButton', () => ({
    PinWorkspaceButton: () => <div data-testid="pin-button" />
}));

describe('WorkspaceItem', () => {
    const defaultProps = {
        id: 'ws-1',
        name: 'Test Workspace',
        isActive: false,
        onSelect: vi.fn(),
        onRename: vi.fn(),
    };

    it('renders workspace name', () => {
        render(<WorkspaceItem {...defaultProps} />);
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    it('applies active class when isActive is true', () => {
        const { container } = render(<WorkspaceItem {...defaultProps} isActive={true} />);
        const element = container.firstChild as HTMLElement;
        expect(element.className).toContain('active');
    });

    it('does not apply active class when isActive is false', () => {
        const { container } = render(<WorkspaceItem {...defaultProps} isActive={false} />);
        const element = container.firstChild as HTMLElement;
        expect(element.className).not.toContain('active');
    });

    it('calls onSelect when clicked', () => {
        render(<WorkspaceItem {...defaultProps} />);
        fireEvent.click(screen.getByText('Test Workspace'));
        expect(defaultProps.onSelect).toHaveBeenCalledWith('ws-1');
    });

    it('enters edit mode on double click', () => {
        render(<WorkspaceItem {...defaultProps} />);
        fireEvent.doubleClick(screen.getByText('Test Workspace'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('Test Workspace');
    });
});
