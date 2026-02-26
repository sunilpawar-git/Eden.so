/**
 * NodeUtilsBar Positioning Integration Tests
 * Validates pill-behind-node positioning and pinned-open state.
 * Visibility and placement are now CSS-driven via parent data attributes.
 * Includes structural CSS convention tests to prevent positioning regressions.
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

/**
 * CSS convention tests — structural checks to prevent positioning regressions.
 * These tests read the source CSS files directly (not parsed by jsdom).
 */
describe('NodeUtilsBar CSS conventions (top-anchor)', () => {
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

    it('.container uses --node-utils-bar-top-offset, not hardcoded 50% for top', () => {
        // Extract only the .container rule (stops before next rule)
        const containerBlock = /\.container\s*\{[^}]+\}/.exec(moduleCss)?.[0] ?? '';
        expect(containerBlock).toContain('--node-utils-bar-top-offset');
        expect(containerBlock).not.toMatch(/top:\s*50%/);
    });

    it('.container transforms do not use translateY(-50%)', () => {
        // Vertical centering removed — bar is top-anchored
        expect(moduleCss).not.toContain('translateY(-50%)');
    });

    it('transition durations use CSS variables, not hardcoded ms values', () => {
        // Design system: animation timings must come from variables, not literals
        expect(variablesCss).toContain('--node-utils-transition-duration');
        expect(variablesCss).toContain('--node-utils-spring-duration');
        // Module CSS must reference those variables in transitions
        expect(moduleCss).toContain('var(--node-utils-transition-duration)');
        expect(moduleCss).toContain('var(--node-utils-spring-duration)');
        // Raw hardcoded ms values must not appear in transition shorthand lines
        const transitionLines = moduleCss
            .split('\n')
            .filter((l) => l.trim().startsWith('opacity') || l.trim().startsWith('transform'));
        transitionLines.forEach((line) => {
            expect(line).not.toMatch(/\b200ms\b/);
            expect(line).not.toMatch(/\b220ms\b/);
        });
    });

    it('peekPulse animation is disabled under prefers-reduced-motion', () => {
        // Accessibility: continuous animation must respect user motion preferences
        expect(moduleCss).toContain('prefers-reduced-motion');
        const reducedBlock = /prefers-reduced-motion[\s\S]*?\}[\s]*\}/.exec(moduleCss)?.[0] ?? '';
        expect(reducedBlock).toContain('animation');
        expect(reducedBlock).toContain('none');
    });
});

describe('NodeUtilsBar strings compliance', () => {
    it('strings.nodeUtils defines moreIcon (no hardcoded ••• in components)', () => {
        // CLAUDE.md: NO HARDCODED STRINGS — ••• must come from strings module
        expect(strings.nodeUtils).toHaveProperty('moreIcon');
        expect(strings.nodeUtils.moreIcon).toBe('•••');
    });

    it('••• button renders the icon from strings.nodeUtils.moreIcon', () => {
        const defaultProps = {
            onTagClick: vi.fn(),
            onAIClick: vi.fn(),
            onConnectClick: vi.fn(),
            onDelete: vi.fn(),
        };
        render(<NodeUtilsBar {...defaultProps} />);
        const moreBtn = screen.getByLabelText('More actions');
        expect(moreBtn.textContent).toBe(strings.nodeUtils.moreIcon);
    });
});

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
