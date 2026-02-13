/**
 * SwUpdatePrompt Component Tests
 * TDD: Verifies update prompt renders correctly and handles user actions
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwUpdatePrompt } from '../SwUpdatePrompt';
import { strings } from '@/shared/localization/strings';
import type { SwRegistrationResult } from '@/shared/hooks/useSwRegistration';

function createMockRegistration(overrides: Partial<SwRegistrationResult> = {}): SwRegistrationResult {
    return {
        needRefresh: false,
        offlineReady: false,
        acceptUpdate: vi.fn(),
        dismissUpdate: vi.fn(),
        ...overrides,
    };
}

describe('SwUpdatePrompt', () => {
    it('renders nothing when no update is available', () => {
        const registration = createMockRegistration({ needRefresh: false });
        const { container } = render(<SwUpdatePrompt registration={registration} />);
        expect(container.firstChild).toBeNull();
    });

    it('shows update prompt when needRefresh is true', () => {
        const registration = createMockRegistration({ needRefresh: true });
        render(<SwUpdatePrompt registration={registration} />);
        expect(screen.getByText(strings.pwa.updateAvailable)).toBeInTheDocument();
        expect(screen.getByText(strings.pwa.updateNow)).toBeInTheDocument();
        expect(screen.getByText(strings.pwa.dismissUpdate)).toBeInTheDocument();
    });

    it('calls acceptUpdate when update button is clicked', () => {
        const acceptUpdate = vi.fn();
        const registration = createMockRegistration({ needRefresh: true, acceptUpdate });
        render(<SwUpdatePrompt registration={registration} />);

        fireEvent.click(screen.getByText(strings.pwa.updateNow));
        expect(acceptUpdate).toHaveBeenCalledOnce();
    });

    it('calls dismissUpdate when dismiss button is clicked', () => {
        const dismissUpdate = vi.fn();
        const registration = createMockRegistration({ needRefresh: true, dismissUpdate });
        render(<SwUpdatePrompt registration={registration} />);

        fireEvent.click(screen.getByText(strings.pwa.dismissUpdate));
        expect(dismissUpdate).toHaveBeenCalledOnce();
    });

    it('has role="alert" for accessibility', () => {
        const registration = createMockRegistration({ needRefresh: true });
        render(<SwUpdatePrompt registration={registration} />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('uses string resources for all visible text', () => {
        const registration = createMockRegistration({ needRefresh: true });
        render(<SwUpdatePrompt registration={registration} />);

        // All visible text should come from strings.pwa
        expect(screen.getByText(strings.pwa.updateAvailable)).toBeInTheDocument();
        expect(screen.getByText(strings.pwa.updateNow)).toBeInTheDocument();
        expect(screen.getByText(strings.pwa.dismissUpdate)).toBeInTheDocument();
    });
});
