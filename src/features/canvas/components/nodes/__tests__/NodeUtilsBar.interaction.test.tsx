/**
 * NodeUtilsBar Interaction Tests — Cross-deck hover, chevron tooltip, stability.
 * Split from NodeUtilsBar.test.tsx to meet 300-line file limit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../../../../hooks/useUtilsBarLayout', () => ({
    useUtilsBarLayout: () => ({
        deckOneActions: ['ai', 'connect', 'copy', 'pin', 'delete'],
        deckTwoActions: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
    }),
}));

describe('NodeUtilsBar interaction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });
    const defaultProps = {
        onTagClick: vi.fn(),
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        disabled: false,
    };

    describe('chevron tooltip removal', () => {
        it('chevron button does not show tooltip on hover', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const chevron = screen.getByLabelText('Show more actions');
            fireEvent.mouseEnter(chevron);
            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });

        it('chevron retains aria-label for screen reader accessibility', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('Show more actions')).toBeInTheDocument();
        });
    });

    describe('cross-deck hover persistence', () => {
        it('mouse leaving deck 1 toward deck 2 does not close deck 2', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbars = screen.getAllByRole('toolbar');
            const deck1 = toolbars[0] as HTMLElement;
            const deck2 = toolbars[1] as HTMLElement;

            fireEvent.click(screen.getByLabelText('Show more actions'));
            expect(deck2.className).toContain('deckTwoOpen');

            fireEvent.mouseLeave(deck1, { relatedTarget: deck2 });
            expect(deck2.className).toContain('deckTwoOpen');
        });

        it('mouse leaving deck 1 away from bar DOES NOT close deck 2 (manual mode)', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbars = screen.getAllByRole('toolbar');
            const deck1 = toolbars[0] as HTMLElement;
            const deck2 = toolbars[1] as HTMLElement;

            fireEvent.click(screen.getByLabelText('Show more actions'));
            expect(deck2.className).toContain('deckTwoOpen');

            fireEvent.mouseLeave(deck1, { relatedTarget: document.body });
            act(() => {
                vi.advanceTimersByTime(300);
            });
            expect(deck2.className).toContain('deckTwoOpen');
        });

        it('mouse leaving deck 2 toward deck 1 does not close deck 2', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbars = screen.getAllByRole('toolbar');
            const deck1 = toolbars[0] as HTMLElement;
            const deck2 = toolbars[1] as HTMLElement;

            fireEvent.click(screen.getByLabelText('Show more actions'));
            expect(deck2.className).toContain('deckTwoOpen');

            fireEvent.mouseLeave(deck2, { relatedTarget: deck1 });
            act(() => {
                vi.advanceTimersByTime(300);
            });
            expect(deck2.className).toContain('deckTwoOpen');
        });
    });

    describe('interaction stability regression', () => {
        it('handles rapid interactions without update-depth errors', () => {
            const onColorChange = vi.fn();
            const onTransform = vi.fn();
            render(
                <NodeUtilsBar
                    {...defaultProps}
                    hasContent={true}
                    onTransform={onTransform}
                    onColorChange={onColorChange}
                />
            );

            for (let i = 0; i < 5; i += 1) {
                fireEvent.click(screen.getByLabelText('Color'));
                fireEvent.click(screen.getByText('Red (Attention)'));
                fireEvent.click(screen.getByLabelText('Transform'));
                fireEvent.click(screen.getByText('Refine'));
                fireEvent.mouseDown(document.body);
            }

            expect(onColorChange).toHaveBeenCalled();
            expect(onTransform).toHaveBeenCalled();
        });
    });

    describe('CSS z-index protection via data attributes', () => {
        it('sets data-bar-active on the container when deck 2 is opened', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbars = screen.getAllByRole('toolbar');
            const container = toolbars[0].parentElement!;

            expect(container.getAttribute('data-bar-active')).toBeNull();

            fireEvent.click(screen.getByLabelText('Show more actions'));

            expect(container.getAttribute('data-bar-active')).toBe('true');
        });
    });
});
