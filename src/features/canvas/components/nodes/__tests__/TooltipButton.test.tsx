/**
 * TooltipButton Tests — TDD RED phase
 * Wraps an action button with a PortalTooltip on hover
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipButton } from '../TooltipButton';

// Mock PortalTooltip so we can assert its props
vi.mock('@/shared/components/PortalTooltip', () => ({
    PortalTooltip: ({
        text, shortcut, visible,
    }: { text: string; shortcut?: string; visible: boolean }) => (
        visible ? (
            <div data-testid="portal-tooltip">
                <span>{text}</span>
                {shortcut && <span data-testid="shortcut-hint">{shortcut}</span>}
            </div>
        ) : null
    ),
}));

// Mock CSS module
vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        icon: 'icon',
    },
}));

describe('TooltipButton', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders button with aria-label', () => {
        render(
            <TooltipButton label="Tags" tooltipText="Tags" icon="🏷️" onClick={vi.fn()} />
        );
        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('renders icon inside button', () => {
        render(
            <TooltipButton label="Tags" tooltipText="Tags" icon="🏷️" onClick={vi.fn()} />
        );
        expect(screen.getByText('🏷️')).toBeInTheDocument();
    });

    it('calls onClick when button is clicked', () => {
        const onClick = vi.fn();
        render(
            <TooltipButton label="Delete" tooltipText="Delete" icon="🗑️" onClick={onClick} />
        );
        fireEvent.click(screen.getByLabelText('Delete'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when disabled prop is true', () => {
        render(
            <TooltipButton
                label="Tags" tooltipText="Tags" icon="🏷️"
                onClick={vi.fn()} disabled
            />
        );
        expect(screen.getByLabelText('Tags')).toBeDisabled();
    });

    it('does not show tooltip when not hovered', () => {
        render(
            <TooltipButton label="Tags" tooltipText="Tags" icon="🏷️" onClick={vi.fn()} />
        );
        expect(screen.queryByTestId('portal-tooltip')).not.toBeInTheDocument();
    });

    it('shows PortalTooltip with correct text on hover', () => {
        render(
            <TooltipButton label="Delete" tooltipText="Delete" icon="🗑️" onClick={vi.fn()} />
        );

        fireEvent.mouseEnter(screen.getByLabelText('Delete'));
        expect(screen.getByTestId('portal-tooltip')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('hides PortalTooltip on mouse leave', () => {
        render(
            <TooltipButton label="Tags" tooltipText="Tags" icon="🏷️" onClick={vi.fn()} />
        );

        const btn = screen.getByLabelText('Tags');
        fireEvent.mouseEnter(btn);
        expect(screen.getByTestId('portal-tooltip')).toBeInTheDocument();

        fireEvent.mouseLeave(btn);
        expect(screen.queryByTestId('portal-tooltip')).not.toBeInTheDocument();
    });

    it('renders shortcut hint when shortcut prop is provided', () => {
        render(
            <TooltipButton
                label="Delete" tooltipText="Delete" shortcut="⌫"
                icon="🗑️" onClick={vi.fn()}
            />
        );

        fireEvent.mouseEnter(screen.getByLabelText('Delete'));
        expect(screen.getByTestId('shortcut-hint')).toBeInTheDocument();
        expect(screen.getByText('⌫')).toBeInTheDocument();
    });

    it('does not render shortcut hint when shortcut is not provided', () => {
        render(
            <TooltipButton label="Tags" tooltipText="Tags" icon="🏷️" onClick={vi.fn()} />
        );

        fireEvent.mouseEnter(screen.getByLabelText('Tags'));
        expect(screen.queryByTestId('shortcut-hint')).not.toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
        render(
            <TooltipButton
                label="Delete" tooltipText="Delete" icon="🗑️"
                onClick={vi.fn()} className="deleteButton"
            />
        );
        expect(screen.getByLabelText('Delete')).toHaveClass('deleteButton');
    });
});
