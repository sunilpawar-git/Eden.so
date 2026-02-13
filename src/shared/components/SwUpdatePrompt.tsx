/**
 * SwUpdatePrompt - Notification banner for available PWA updates
 * Renders nothing when no update is available.
 * All text from strings.pwa.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';
import type { SwRegistrationResult } from '@/shared/hooks/useSwRegistration';
import styles from './SwUpdatePrompt.module.css';

interface SwUpdatePromptProps {
    registration: SwRegistrationResult;
}

export function SwUpdatePrompt({ registration }: SwUpdatePromptProps) {
    const { needRefresh, acceptUpdate, dismissUpdate } = registration;

    if (!needRefresh) {
        return null;
    }

    return (
        <div className={styles.banner} role="alert">
            <span className={styles.message}>
                {strings.pwa.updateAvailable}
            </span>
            <div className={styles.actions}>
                <button
                    className={styles.updateButton}
                    onClick={acceptUpdate}
                >
                    {strings.pwa.updateNow}
                </button>
                <button
                    className={styles.dismissButton}
                    onClick={dismissUpdate}
                >
                    {strings.pwa.dismissUpdate}
                </button>
            </div>
        </div>
    );
}
