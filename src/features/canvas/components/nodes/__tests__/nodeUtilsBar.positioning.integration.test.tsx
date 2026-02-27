/**
 * NodeUtilsBar Positioning Integration Tests
 * Validates dual-deck positioning, z-index layering, and pinned-open state.
 * Visibility and placement are CSS-driven via parent data attributes.
 * Includes structural CSS convention tests to prevent regressions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        barWrapper: 'barWrapper',
        deckBase: 'deckBase',
        deckOne: 'deckOne',
        deckTwo: 'deckTwo',
        deckTwoOpen: 'deckTwoOpen',
        deckOnePinned: 'deckOnePinned',
        deckTwoPinned: 'deckTwoPinned',
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

vi.mock('../../../../hooks/useUtilsBarLayout', () => ({
    useUtilsBarLayout: () => ({
        deckOneActions: ['ai', 'connect', 'copy', 'pin', 'delete'],
        deckTwoActions: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
    }),
}));

describe('NodeUtilsBar CSS conventions (dual-deck)', () => {
    const cssPath = resolve(__dirname, '../NodeUtilsBar.module.css');
    const variablesPath = resolve(__dirname, '../../../../../styles/variables.css');
    let moduleCss: string;
    let variablesCss: string;

    beforeEach(() => {
        moduleCss = readFileSync(cssPath, 'utf8');
        variablesCss = readFileSync(variablesPath, 'utf8');
    });

    it('variables.css defines --node-utils-bar-top-offset', () => {
        expect(variablesCss).toContain('--node-utils-bar-top-offset');
    });

    it('variables.css defines dual-deck design tokens', () => {
        expect(variablesCss).toContain('--node-utils-deck-gap');
        expect(variablesCss).toContain('--node-utils-deck-stagger-delay');
        expect(variablesCss).toContain('--node-utils-deck-rotation');
        expect(variablesCss).toContain('--node-utils-deck-two-z');
    });

    it('CSS defines both .deckOne and .deckTwo classes', () => {
        expect(moduleCss).toContain('.deckOne');
        expect(moduleCss).toContain('.deckTwo');
    });

    it('CSS defines .deckTwoOpen class for controller-driven visibility', () => {
        expect(moduleCss).toContain('.deckTwoOpen');
    });

    it('CSS does not use translateY(-50%)', () => {
        expect(moduleCss).not.toContain('translateY(-50%)');
    });

    it('.barWrapper uses left: 100% to position outside card (not right: 0)', () => {
        expect(moduleCss).toContain('left: 100%');
        const barWrapperBlock = moduleCss.split('.barWrapper')[1]?.split('}')[0] ?? '';
        expect(barWrapperBlock).not.toMatch(/right:\s*0/);
    });

    it('transition durations use CSS variables, not hardcoded ms values', () => {
        expect(variablesCss).toContain('--node-utils-transition-duration');
        expect(variablesCss).toContain('--node-utils-spring-duration');
        expect(moduleCss).toContain('var(--node-utils-transition-duration)');
        expect(moduleCss).toContain('var(--node-utils-spring-duration)');
        const transitionLines = moduleCss
            .split('\n')
            .filter((l) => l.trim().startsWith('opacity') || l.trim().startsWith('transform'));
        transitionLines.forEach((line) => {
            expect(line).not.toMatch(/\b200ms\b/);
            expect(line).not.toMatch(/\b220ms\b/);
        });
    });

    it('z-index uses CSS variables for both decks', () => {
        expect(moduleCss).toContain('var(--z-dropdown)');
        expect(moduleCss).toContain('var(--node-utils-deck-two-z)');
    });

    it('peekPulse animation is disabled under prefers-reduced-motion', () => {
        expect(moduleCss).toContain('prefers-reduced-motion');
        const reducedBlock = /prefers-reduced-motion[\s\S]*?\}[\s]*\}/.exec(moduleCss)?.[0] ?? '';
        expect(reducedBlock).toContain('animation');
        expect(reducedBlock).toContain('none');
    });
});

describe('NodeUtilsBar strings compliance', () => {
    it('strings.nodeUtils defines moreIcon (no hardcoded ••• in components)', () => {
        expect(strings.nodeUtils).toHaveProperty('moreIcon');
        expect(strings.nodeUtils.moreIcon).toBe('•••');
    });

    it('strings.nodeUtils defines expandDeck and expandDeckIcon', () => {
        expect(strings.nodeUtils).toHaveProperty('expandDeck');
        expect(strings.nodeUtils).toHaveProperty('expandDeckIcon');
        expect(strings.nodeUtils.expandDeckIcon).toBe('\u203A');
    });

    it('no ••• overflow button renders (sub-menus are inline)', () => {
        const defaultProps = {
            onTagClick: vi.fn(), onAIClick: vi.fn(),
            onConnectClick: vi.fn(), onDelete: vi.fn(),
            onShareClick: vi.fn().mockResolvedValue(undefined),
        };
        render(<NodeUtilsBar {...defaultProps} />);
        expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
    });
});

describe('NodeUtilsBar Positioning (dual-deck)', () => {
    const defaultProps = {
        onTagClick: vi.fn(), onAIClick: vi.fn(),
        onConnectClick: vi.fn(), onDelete: vi.fn(), disabled: false,
    };

    beforeEach(() => { vi.clearAllMocks(); });

    it('renders two deck toolbars', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = screen.getAllByRole('toolbar');
        expect(toolbars.length).toBe(2);
    });

    it('deck one has correct aria-label', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = screen.getAllByRole('toolbar');
        expect(toolbars[0]).toHaveAttribute('aria-label', strings.canvas.nodeActionsLabel);
    });

    it('deck two has correct aria-label', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = screen.getAllByRole('toolbar');
        expect(toolbars[1]).toHaveAttribute('aria-label', strings.settings.toolbarBar2);
    });

    it('renders peek indicator as sibling of decks', () => {
        const { container } = render(
            <div><NodeUtilsBar {...defaultProps} /></div>,
        );
        const peek = container.querySelector('.peekIndicator');
        expect(peek).toBeInTheDocument();
    });

    it('applies deckOnePinned when isPinnedOpen', () => {
        const { container } = render(
            <NodeUtilsBar {...defaultProps} isPinnedOpen={true} />,
        );
        const toolbars = container.querySelectorAll('[role="toolbar"]');
        expect(toolbars[0]).toHaveClass('deckOnePinned');
    });

    describe('regression: primary buttons still pass', () => {
        it('renders primary action buttons in deck one', () => {
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
            expect(screen.getByLabelText('Delete')).toBeDisabled();
            expect(screen.getByLabelText('Tags')).toBeDisabled();
        });

        it('Tags is rendered directly in deck two (not behind overflow)', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        });
    });
});
