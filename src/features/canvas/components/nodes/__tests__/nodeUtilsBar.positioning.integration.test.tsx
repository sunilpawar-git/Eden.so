/**
 * NodeUtilsBar Positioning Integration Tests
 * Validates pill-behind-node positioning and pinned-open state.
 * Visibility and placement are now CSS-driven via parent data attributes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        barWrapper: 'barWrapper',
        container: 'container',
        containerPinnedOpen: 'containerPinnedOpen',
        peekIndicator: 'peekIndicator',
    },
}));

vi.mock('../TooltipButton.module.css', () => ({
    default: {
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        icon: 'icon',
    },
}));

describe('NodeUtilsBar Positioning', () => {
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('has default (hidden) CSS class by default', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} />);
        const bar = container.querySelector('[role="toolbar"]') as HTMLElement;

        expect(bar).toHaveClass('container');
        expect(bar).not.toHaveClass('containerPinnedOpen');
    });

    it('renders peek indicator as sibling of container', () => {
        const { container } = render(
            <div><NodeUtilsBar {...defaultProps} /></div>
        );
        const bar = container.querySelector('.container');
        const peek = container.querySelector('.peekIndicator');

        expect(bar).toBeInTheDocument();
        expect(peek).toBeInTheDocument();
        expect(bar?.contains(peek)).toBe(false);
    });

    it('applies containerPinnedOpen when isPinnedOpen', () => {
        const { container } = render(
            <NodeUtilsBar {...defaultProps} isPinnedOpen={true} />
        );
        const bar = container.querySelector('[role="toolbar"]') as HTMLElement;
        expect(bar).toHaveClass('containerPinnedOpen');
    });

    describe('regression: primary buttons still pass', () => {
        it('renders primary action buttons directly in bar', () => {
            render(<NodeUtilsBar {...defaultProps} />);

            expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
            expect(screen.getByLabelText('Connect')).toBeInTheDocument();
            expect(screen.getByLabelText('Delete')).toBeInTheDocument();
        });

        it('calls callbacks when primary buttons clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);

            fireEvent.click(screen.getByLabelText('Delete'));
            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('disables primary buttons when disabled prop is true', () => {
            render(<NodeUtilsBar {...defaultProps} disabled={true} />);

            expect(screen.getByLabelText('More actions')).toBeDisabled();
            expect(screen.getByLabelText('Delete')).toBeDisabled();
        });

        it('Tags is in overflow — opens after clicking •••', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });
    });
});
