/**
 * NodeUtilsBar Positioning Integration Tests
 * Validates pill-behind-node positioning, left variant, and pinned-open state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

// Mock CSS modules — complete set of positioning + button classes
vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        container: 'container',
        containerVisible: 'containerVisible',
        containerLeft: 'containerLeft',
        containerPinnedOpen: 'containerPinnedOpen',
        peekIndicator: 'peekIndicator',
        peekIndicatorLeft: 'peekIndicatorLeft',
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
        visible: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('has default (hidden) CSS class when visible is false', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} visible={false} />);
        const bar = container.querySelector('[class*="container"]') as HTMLElement;

        expect(bar).toHaveClass('container');
        expect(bar).not.toHaveClass('containerVisible');
    });

    it('has visible CSS class when visible is true', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} visible={true} />);
        const bar = container.querySelector('[class*="container"]') as HTMLElement;

        expect(bar).toHaveClass('container');
        expect(bar).toHaveClass('containerVisible');
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

    it('applies containerLeft class when placement is left', () => {
        const { container } = render(
            <NodeUtilsBar {...defaultProps} placement="left" />
        );
        const bar = container.querySelector('[class*="container"]') as HTMLElement;
        expect(bar).toHaveClass('containerLeft');
    });

    it('applies peekIndicatorLeft class when placement is left', () => {
        const { container } = render(
            <NodeUtilsBar {...defaultProps} placement="left" />
        );
        const peek = container.querySelector('.peekIndicator');
        expect(peek).toHaveClass('peekIndicatorLeft');
    });

    it('applies containerPinnedOpen instead of containerVisible when isPinnedOpen', () => {
        const { container } = render(
            <NodeUtilsBar {...defaultProps} isPinnedOpen={true} />
        );
        const bar = container.querySelector('[class*="container"]') as HTMLElement;
        expect(bar).toHaveClass('containerPinnedOpen');
        expect(bar).not.toHaveClass('containerVisible');
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
