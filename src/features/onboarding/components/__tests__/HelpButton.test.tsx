import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HelpButton } from '../HelpButton';
import { strings } from '@/shared/localization/strings';

vi.mock('@/shared/hooks/useEscapeLayer', () => ({ useEscapeLayer: vi.fn() }));

describe('HelpButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders "?" with the correct aria-label', () => {
        render(<HelpButton isOnboardingActive={false} onReplay={vi.fn()} />);
        const btn = screen.getByTestId('help-button');
        expect(btn).toHaveAttribute('aria-label', strings.onboarding.helpButtonLabel);
        expect(btn).toHaveTextContent('?');
    });

    it('returns null when isOnboardingActive=true', () => {
        render(<HelpButton isOnboardingActive={true} onReplay={vi.fn()} />);
        expect(screen.queryByTestId('help-button')).toBeNull();
    });

    it('clicking HelpButton opens ShortcutsPanel', () => {
        render(<HelpButton isOnboardingActive={false} onReplay={vi.fn()} />);
        fireEvent.click(screen.getByTestId('help-button'));
        expect(screen.getByTestId('shortcuts-panel')).toBeInTheDocument();
    });

    it('ShortcutsPanel lists shortcut rows', () => {
        render(<HelpButton isOnboardingActive={false} onReplay={vi.fn()} />);
        fireEvent.click(screen.getByTestId('help-button'));
        expect(screen.getByText(strings.shortcuts.addNode)).toBeInTheDocument();
        expect(screen.getByText(strings.shortcuts.undo)).toBeInTheDocument();
    });

    it('"Replay walkthrough" calls the onReplay prop directly', () => {
        const onReplay = vi.fn();
        render(<HelpButton isOnboardingActive={false} onReplay={onReplay} />);
        fireEvent.click(screen.getByTestId('help-button'));
        fireEvent.click(screen.getByTestId('replay-btn'));
        expect(onReplay).toHaveBeenCalledOnce();
    });

    it('Escape closes ShortcutsPanel via useEscapeLayer SETTINGS_PANEL', async () => {
        const { useEscapeLayer } = await import('@/shared/hooks/useEscapeLayer');
        let capturedHandler: (() => void) | undefined;
        (useEscapeLayer as ReturnType<typeof vi.fn>).mockImplementation(
            (_: number, active: boolean, handler: () => void) => {
                if (active) capturedHandler = handler;
            },
        );
        render(<HelpButton isOnboardingActive={false} onReplay={vi.fn()} />);
        fireEvent.click(screen.getByTestId('help-button'));
        expect(screen.getByTestId('shortcuts-panel')).toBeInTheDocument();
        act(() => { capturedHandler?.(); });
        expect(screen.queryByTestId('shortcuts-panel')).toBeNull();
    });

    it('all labels come from string resources — no inline strings', () => {
        render(<HelpButton isOnboardingActive={false} onReplay={vi.fn()} />);
        fireEvent.click(screen.getByTestId('help-button'));
        expect(screen.getByText(strings.onboarding.shortcutsPanelTitle)).toBeInTheDocument();
        expect(screen.getByText(strings.onboarding.replayWalkthrough)).toBeInTheDocument();
    });
});
