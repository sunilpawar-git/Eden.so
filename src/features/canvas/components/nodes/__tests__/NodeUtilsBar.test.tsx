/**
 * NodeUtilsBar Tests — TDD
 * Tests for the floating node utilities action bar with overflow menu.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

describe('NodeUtilsBar', () => {
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
    };

    describe('primary buttons', () => {
        it('renders AI Actions button directly in bar', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('AI Actions')).toBeInTheDocument();
        });

        it('renders Connect button directly in bar', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('Connect')).toBeInTheDocument();
        });

        it('renders Delete button directly in bar', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('Delete')).toBeInTheDocument();
        });

        it('calls onAIClick when AI Actions button is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('AI Actions'));
            expect(defaultProps.onAIClick).toHaveBeenCalledTimes(1);
        });

        it('calls onConnectClick when Connect button is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Connect'));
            expect(defaultProps.onConnectClick).toHaveBeenCalledTimes(1);
        });

        it('calls onDelete when Delete button is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Delete'));
            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('disables primary buttons when disabled prop is true', () => {
            render(<NodeUtilsBar {...defaultProps} disabled={true} />);
            expect(screen.getByLabelText('AI Actions')).toBeDisabled();
            expect(screen.getByLabelText('Connect')).toBeDisabled();
            expect(screen.getByLabelText('Delete')).toBeDisabled();
        });
    });

    describe('Copy button (primary, conditional)', () => {
        it('renders copy button when onCopyClick is provided', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} />);
            expect(screen.getByLabelText('Copy')).toBeInTheDocument();
        });

        it('does not render copy button when onCopyClick is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('Copy')).not.toBeInTheDocument();
        });

        it('calls onCopyClick when Copy button is clicked', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={true} />);
            fireEvent.click(screen.getByLabelText('Copy'));
            expect(onCopyClick).toHaveBeenCalledTimes(1);
        });

        it('disables copy button when disabled prop is true', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} disabled={true} />);
            expect(screen.getByLabelText('Copy')).toBeDisabled();
        });

        it('disables copy button when hasContent is false', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={false} />);
            expect(screen.getByLabelText('Copy')).toBeDisabled();
        });

        it('enables copy button when hasContent is true', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={true} />);
            expect(screen.getByLabelText('Copy')).toBeEnabled();
        });

        it('does not call onCopyClick when copy button is disabled', () => {
            const onCopyClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCopyClick={onCopyClick} hasContent={false} />);
            fireEvent.click(screen.getByLabelText('Copy'));
            expect(onCopyClick).not.toHaveBeenCalled();
        });
    });

    describe('overflow menu (secondary actions)', () => {
        it('shows ••• overflow button when onTagClick is provided (always)', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('More actions')).toBeInTheDocument();
        });

        it('Tags button is NOT in DOM before overflow is opened', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
        });

        it('clicking ••• reveals Tags in the dropdown', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });

        it('clicking Tags in overflow calls onTagClick and closes overflow', () => {
            const onTagClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onTagClick={onTagClick} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            fireEvent.click(screen.getByLabelText('Tags'));
            expect(onTagClick).toHaveBeenCalledTimes(1);
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
        });

        it('renders Focus in overflow when onFocusClick is provided', () => {
            const onFocusClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onFocusClick={onFocusClick} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Focus')).toBeInTheDocument();
        });

        it('Focus button is not in overflow when onFocusClick is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.queryByLabelText('Focus')).not.toBeInTheDocument();
        });

        it('renders Duplicate in overflow when onDuplicateClick is provided', () => {
            const onDuplicateClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onDuplicateClick={onDuplicateClick} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Duplicate')).toBeInTheDocument();
        });

        it('renders Image in overflow when onImageClick is provided', () => {
            const onImageClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onImageClick={onImageClick} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Image')).toBeInTheDocument();
        });

        it('renders Collapse in overflow when onCollapseToggle is provided', () => {
            const onCollapseToggle = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCollapseToggle={onCollapseToggle} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Collapse')).toBeInTheDocument();
        });

        it('renders Color in overflow when onColorChange is provided', () => {
            const onColorChange = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onColorChange={onColorChange} />);
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Color')).toBeInTheDocument();
        });

        it('renders Expand (not Collapse) in overflow when isCollapsed is true', () => {
            const onCollapseToggle = vi.fn();
            render(
                <NodeUtilsBar
                    {...defaultProps}
                    onCollapseToggle={onCollapseToggle}
                    isCollapsed={true}
                />,
            );
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Expand')).toBeInTheDocument();
            expect(screen.queryByLabelText('Collapse')).not.toBeInTheDocument();
        });
    });

    describe('auto-open on hover (600ms timer)', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('overflow items appear after 600ms hover on toolbar', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            act(() => { fireEvent.mouseEnter(toolbar); });
            act(() => { vi.advanceTimersByTime(599); });
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
            act(() => { vi.advanceTimersByTime(1); });
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });

        it('overflow does NOT open if mouse leaves before 600ms', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            act(() => { fireEvent.mouseEnter(toolbar); });
            act(() => { vi.advanceTimersByTime(400); });
            act(() => { fireEvent.mouseLeave(toolbar); });
            act(() => { vi.advanceTimersByTime(200); });
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
        });

        it('auto-opened overflow closes on mouse leave', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            act(() => { fireEvent.mouseEnter(toolbar); });
            act(() => { vi.advanceTimersByTime(600); });
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
            act(() => { fireEvent.mouseLeave(toolbar); });
            expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
        });

        it('manually opened overflow does NOT close on mouse leave', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            fireEvent.click(screen.getByLabelText('More actions'));
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
            act(() => { fireEvent.mouseLeave(toolbar); });
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });
    });

    describe('Pin button (primary, conditional)', () => {
        it('renders Pin button directly in bar when onPinToggle is provided', () => {
            render(<NodeUtilsBar {...defaultProps} onPinToggle={vi.fn()} />);
            expect(screen.getByLabelText('Pin')).toBeInTheDocument();
        });

        it('renders Unpin when isPinned is true', () => {
            render(<NodeUtilsBar {...defaultProps} onPinToggle={vi.fn()} isPinned={true} />);
            expect(screen.getByLabelText('Unpin')).toBeInTheDocument();
        });

        it('does not render Pin button when onPinToggle is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('Pin')).not.toBeInTheDocument();
        });
    });

    describe('interaction stability regression', () => {
        it('handles rapid overflow/submenu interactions without update-depth errors', () => {
            const onColorChange = vi.fn();
            const onTransform = vi.fn();
            const onShare = vi.fn().mockResolvedValue(undefined);
            render(
                <NodeUtilsBar
                    {...defaultProps}
                    hasContent={true}
                    onTransform={onTransform}
                    onColorChange={onColorChange}
                    onShareClick={onShare}
                />
            );

            for (let i = 0; i < 5; i += 1) {
                fireEvent.click(screen.getByLabelText('More actions'));
                fireEvent.click(screen.getByLabelText('Color'));
                fireEvent.click(screen.getByText('Blue'));
                fireEvent.click(screen.getByLabelText('Transform'));
                fireEvent.click(screen.getByText('Refine'));
                fireEvent.mouseDown(document.body);
            }

            expect(onColorChange).toHaveBeenCalled();
            expect(onTransform).toHaveBeenCalled();
        });
    });
});
