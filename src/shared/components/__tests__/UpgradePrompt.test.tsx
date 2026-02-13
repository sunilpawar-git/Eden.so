/**
 * UpgradePrompt Component Tests
 * TDD: Verifies upgrade prompt UI and string resource usage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradePrompt } from '../UpgradePrompt';
import { strings } from '@/shared/localization/strings';

describe('UpgradePrompt', () => {
    it('renders upgrade title', () => {
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} />);
        expect(screen.getByText(strings.subscription.upgradeTitle)).toBeInTheDocument();
    });

    it('renders upgrade message with feature name', () => {
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} />);
        // The paragraph contains both the message and the feature name
        const paragraph = screen.getByText(/Offline Pin/);
        expect(paragraph.textContent).toContain(strings.subscription.upgradeMessage);
    });

    it('renders upgrade CTA button', () => {
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} />);
        expect(screen.getByText(strings.subscription.upgradeCta)).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
        const onDismiss = vi.fn();
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={onDismiss} />);
        fireEvent.click(screen.getByText(strings.subscription.dismissUpgrade));
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('has role="dialog" for accessibility', () => {
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onUpgrade when upgrade button is clicked', () => {
        const onUpgrade = vi.fn();
        render(
            <UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} onUpgrade={onUpgrade} />
        );
        fireEvent.click(screen.getByText(strings.subscription.upgradeCta));
        expect(onUpgrade).toHaveBeenCalledOnce();
    });

    it('renders upgrade button without onClick when onUpgrade not provided', () => {
        render(<UpgradePrompt featureName="Offline Pin" onDismiss={vi.fn()} />);
        const button = screen.getByText(strings.subscription.upgradeCta);
        // Should not throw when clicked without handler
        expect(() => fireEvent.click(button)).not.toThrow();
    });

    it('uses string resources for all visible text', () => {
        render(<UpgradePrompt featureName="Test Feature" onDismiss={vi.fn()} />);
        expect(screen.getByText(strings.subscription.upgradeTitle)).toBeInTheDocument();
        expect(screen.getByText(strings.subscription.upgradeCta)).toBeInTheDocument();
        expect(screen.getByText(strings.subscription.dismissUpgrade)).toBeInTheDocument();
    });
});
