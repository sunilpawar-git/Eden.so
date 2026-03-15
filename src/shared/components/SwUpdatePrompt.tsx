/**
 * SwUpdatePrompt - Notification banner for available PWA updates
 * Renders nothing when no update is available.
 * All text from strings.pwa.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';
import type { SwRegistrationResult } from '@/shared/hooks/useSwRegistration';

interface SwUpdatePromptProps {
    registration: SwRegistrationResult;
}

export function SwUpdatePrompt({ registration }: SwUpdatePromptProps) {
    const { needRefresh, acceptUpdate, dismissUpdate } = registration;

    if (!needRefresh) {
        return null;
    }

    return (
        <div
            className="fixed flex items-center bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] z-[var(--z-toast)] text-[var(--font-size-sm)] animate-[slideUp_var(--transition-normal)]"
            style={{ bottom: 24, right: 24, gap: 16, padding: 16 }}
            role="alert"
        >
            <span className="text-[var(--color-text-primary)]">
                {strings.pwa.updateAvailable}
            </span>
            <div className="flex" style={{ gap: 8 }}>
                <button
                    className="bg-[var(--color-primary)] text-[var(--header-text)] border-none rounded-md text-[var(--font-size-sm)] font-medium cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-primary-hover)]"
                    style={{ padding: '4px 16px' }}
                    onClick={acceptUpdate}
                >
                    {strings.pwa.updateNow}
                </button>
                <button
                    className="bg-transparent border-none text-[var(--color-text-secondary)] text-[var(--font-size-sm)] cursor-pointer transition-colors duration-150 ease-in-out hover:text-[var(--color-text-primary)]"
                    style={{ padding: 4 }}
                    onClick={dismissUpdate}
                >
                    {strings.pwa.dismissUpdate}
                </button>
            </div>
        </div>
    );
}
