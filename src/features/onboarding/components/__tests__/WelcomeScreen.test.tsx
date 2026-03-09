import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '../WelcomeScreen';
import { strings } from '@/shared/localization/strings';

vi.mock('@/shared/hooks/useEscapeLayer', () => ({
    useEscapeLayer: vi.fn((_, active: boolean, handler: () => void) => {
        // Simulate Escape key by calling handler directly in tests
        if (active) {
            (globalThis as Record<string, unknown>).__escapeHandler = handler;
        }
    }),
}));

describe('WelcomeScreen', () => {
    beforeEach(() => {
        delete (globalThis as Record<string, unknown>).__escapeHandler;
    });

    it('renders the welcome title', () => {
        render(<WelcomeScreen onDismiss={vi.fn()} />);
        expect(screen.getByText(strings.onboarding.welcome.title)).toBeInTheDocument();
    });

    it('renders all 3 bullets from strings', () => {
        render(<WelcomeScreen onDismiss={vi.fn()} />);
        expect(screen.getByText(strings.onboarding.welcome.bullet1)).toBeInTheDocument();
        expect(screen.getByText(strings.onboarding.welcome.bullet2)).toBeInTheDocument();
        expect(screen.getByText(strings.onboarding.welcome.bullet3)).toBeInTheDocument();
    });

    it('"Let\'s go →" button calls onDismiss', () => {
        const onDismiss = vi.fn();
        render(<WelcomeScreen onDismiss={onDismiss} />);
        fireEvent.click(screen.getByText(strings.onboarding.welcome.ctaLabel));
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('Escape calls onDismiss via useEscapeLayer', () => {
        const onDismiss = vi.fn();
        render(<WelcomeScreen onDismiss={onDismiss} />);
        const handler = (globalThis as Record<string, unknown>).__escapeHandler as (() => void) | undefined;
        handler?.();
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('renders into document.body (portal)', () => {
        const { baseElement } = render(<WelcomeScreen onDismiss={vi.fn()} />);
        expect(baseElement.querySelector('[data-testid="welcome-screen"]')).toBeTruthy();
    });

    it('CTA button receives autoFocus on mount', () => {
        render(<WelcomeScreen onDismiss={vi.fn()} />);
        const btn = screen.getByText(strings.onboarding.welcome.ctaLabel);
        expect(btn).toHaveFocus();
    });

    it('has role=dialog, aria-modal, and aria-labelledby pointing to the title', () => {
        render(<WelcomeScreen onDismiss={vi.fn()} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-welcome-title');
        expect(document.getElementById('onboarding-welcome-title')).toHaveTextContent(
            strings.onboarding.welcome.title,
        );
    });
});
