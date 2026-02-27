/**
 * NodeUtilsBar Tests — TDD
 * Tests for the floating node utilities action bar with dual-deck layout.
 * Deck 1: primary actions. Deck 2: secondary actions rendered as direct buttons.
 * All sub-menus (ColorMenu, ShareMenu) render inline in their deck — no overflow.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../../../../hooks/useUtilsBarLayout', () => ({
    useUtilsBarLayout: () => ({
        deckOneActions: ['ai', 'connect', 'copy', 'pin', 'delete'],
        deckTwoActions: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
    }),
}));

describe('NodeUtilsBar', () => {
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
    };

    describe('primary buttons (deck 1)', () => {
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
    });

    describe('deck 2 buttons (direct, not in overflow)', () => {
        it('Tags button is rendered directly when onTagClick is provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });

        it('calls onTagClick when Tags button is clicked', () => {
            const onTagClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onTagClick={onTagClick} />);
            fireEvent.click(screen.getByLabelText('Tags'));
            expect(onTagClick).toHaveBeenCalledTimes(1);
        });

        it('renders Focus directly when onFocusClick is provided', () => {
            const onFocusClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onFocusClick={onFocusClick} />);
            expect(screen.getByLabelText('Focus')).toBeInTheDocument();
        });

        it('does not render Focus when onFocusClick is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('Focus')).not.toBeInTheDocument();
        });

        it('renders Duplicate directly when onDuplicateClick is provided', () => {
            const onDuplicateClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onDuplicateClick={onDuplicateClick} />);
            expect(screen.getByLabelText('Duplicate')).toBeInTheDocument();
        });

        it('renders Image directly when onImageClick is provided', () => {
            const onImageClick = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onImageClick={onImageClick} />);
            expect(screen.getByLabelText('Image')).toBeInTheDocument();
        });

        it('renders Collapse directly when onCollapseToggle is provided', () => {
            const onCollapseToggle = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onCollapseToggle={onCollapseToggle} />);
            expect(screen.getByLabelText('Collapse')).toBeInTheDocument();
        });

        it('renders Expand (not Collapse) when isCollapsed is true', () => {
            const onCollapseToggle = vi.fn();
            render(
                <NodeUtilsBar
                    {...defaultProps}
                    onCollapseToggle={onCollapseToggle}
                    isCollapsed={true}
                />,
            );
            expect(screen.getByLabelText('Expand')).toBeInTheDocument();
            expect(screen.queryByLabelText('Collapse')).not.toBeInTheDocument();
        });

        it('renders Color directly when onColorChange is provided', () => {
            const onColorChange = vi.fn();
            render(<NodeUtilsBar {...defaultProps} onColorChange={onColorChange} />);
            expect(screen.getByLabelText('Color')).toBeInTheDocument();
        });

        it('renders Share directly when onShareClick is provided', () => {
            const onShareClick = vi.fn().mockResolvedValue(undefined);
            render(<NodeUtilsBar {...defaultProps} onShareClick={onShareClick} />);
            expect(screen.getByLabelText('Share')).toBeInTheDocument();
        });
    });

    describe('no overflow menu (sub-menus render inline)', () => {
        it('does NOT show ••• button even when onShareClick is provided', () => {
            const onShareClick = vi.fn().mockResolvedValue(undefined);
            render(<NodeUtilsBar {...defaultProps} onShareClick={onShareClick} />);
            expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
        });

        it('does not show ••• button when onShareClick is not provided', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
        });

        it('clicking Share opens ShareMenu portal directly', () => {
            const onShareClick = vi.fn().mockResolvedValue(undefined);
            render(<NodeUtilsBar {...defaultProps} onShareClick={onShareClick} />);
            fireEvent.click(screen.getByLabelText('Share'));
            expect(screen.getByTestId('share-menu-portal')).toBeInTheDocument();
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

    describe('deck 2 isolation (data-bar-focused must NOT open deck 2)', () => {
        it('clicking a deck 1 button does not add deckTwoOpen class to deck 2', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Connect'));
            const toolbars = screen.getAllByRole('toolbar');
            const deck2 = toolbars[1] as HTMLElement;
            expect(deck2.className).not.toContain('deckTwoOpen');
        });

        it('deck 2 toolbar does not gain deckTwoOpen when Delete is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Delete'));
            const toolbars = screen.getAllByRole('toolbar');
            const deck2 = toolbars[1] as HTMLElement;
            expect(deck2.className).not.toContain('deckTwoOpen');
        });
    });

});
