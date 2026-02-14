/**
 * NodeUtilsBar Positioning Integration Tests — TDD RED phase
 * Validates pill-behind-node positioning, hover reveal, and focus-within accessibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

// Mock CSS module with positioning classes
vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        container: 'container',
        containerVisible: 'containerVisible',
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        icon: 'icon',
        peekIndicator: 'peekIndicator',
    },
}));

describe('NodeUtilsBar Positioning', () => {
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
        visible: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('has default (hidden) CSS class when visible is false', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} visible={false} />);
        const bar = container.firstChild as HTMLElement;

        expect(bar).toHaveClass('container');
        expect(bar).not.toHaveClass('containerVisible');
    });

    it('has visible CSS class when visible is true', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} visible={true} />);
        const bar = container.firstChild as HTMLElement;

        expect(bar).toHaveClass('container');
        expect(bar).toHaveClass('containerVisible');
    });

    it('renders peek indicator element', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} />);
        const peekEl = container.querySelector('.peekIndicator');

        expect(peekEl).toBeInTheDocument();
    });

    it('peek indicator is a sibling of the container, not a child', () => {
        const { container } = render(
            <div>
                <NodeUtilsBar {...defaultProps} />
            </div>
        );
        // The NodeUtilsBar should render both the container and the peek
        // as children of a wrapper (or the peek should be outside the container)
        const bar = container.querySelector('.container');
        const peek = container.querySelector('.peekIndicator');

        expect(bar).toBeInTheDocument();
        expect(peek).toBeInTheDocument();
        // Peek should NOT be inside the bar container
        expect(bar?.contains(peek)).toBe(false);
    });

    describe('regression: all existing button tests still pass', () => {
        it('renders all action buttons', () => {
            render(<NodeUtilsBar {...defaultProps} />);

            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
            expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
            expect(screen.getByLabelText('Connect')).toBeInTheDocument();
            expect(screen.getByLabelText('Delete')).toBeInTheDocument();
        });

        it('calls callbacks when buttons clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);

            fireEvent.click(screen.getByLabelText('Tags'));
            expect(defaultProps.onTagClick).toHaveBeenCalledTimes(1);

            fireEvent.click(screen.getByLabelText('Delete'));
            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('disables buttons when disabled prop is true', () => {
            render(<NodeUtilsBar {...defaultProps} disabled={true} />);

            expect(screen.getByLabelText('Tags')).toBeDisabled();
            expect(screen.getByLabelText('Delete')).toBeDisabled();
        });
    });
});
