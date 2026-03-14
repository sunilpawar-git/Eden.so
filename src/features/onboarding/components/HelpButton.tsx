/**
 * HelpButton — persistent "?" button; hidden while onboarding is active.
 * Opens ShortcutsPanel; triggers replay via onReplay prop.
 *
 * Prop-driven visibility: parent (OnboardingWalkthrough) holds the single
 * useOnboarding() instance and derives isOnboardingActive, ensuring a single
 * reducer state machine governs both the walkthrough and this button.
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { ShortcutsPanel } from './ShortcutsPanel';
import styles from './HelpButton.module.css';

export interface HelpButtonProps {
    readonly isOnboardingActive: boolean; // true while WelcomeScreen OR coach marks are showing
    readonly onReplay:           () => void;
}

export const HelpButton = React.memo(function HelpButton({
    isOnboardingActive,
    onReplay,
}: HelpButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = useCallback(() => setIsOpen((v) => !v), []);
    const close  = useCallback(() => setIsOpen(false),     []);

    const handleReplay = useCallback(() => {
        setIsOpen(false);
        onReplay();
    }, [onReplay]);

    // Don't stack escape handlers — hide during active onboarding
    if (isOnboardingActive) return null;

    return (
        <>
            <button
                className={styles.helpButton}
                onClick={toggle}
                aria-label={strings.onboarding.helpButtonLabel}
                aria-expanded={isOpen}
                type="button"
                data-testid="help-button"
            >
                ?
            </button>
            {isOpen && <ShortcutsPanel onClose={close} onReplay={handleReplay} />}
        </>
    );
});
