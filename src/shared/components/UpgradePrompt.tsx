/**
 * UpgradePrompt - Shown when free users try to access pro features
 * All text from strings.subscription.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';

interface UpgradePromptProps {
    featureName: string;
    onDismiss: () => void;
    onUpgrade?: () => void;
}

export function UpgradePrompt({ featureName, onDismiss, onUpgrade }: UpgradePromptProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[hsla(0,0%,0%,0.4)] z-[var(--z-modal)]" role="dialog" aria-modal="true">
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-[var(--space-xl)] max-w-[400px] w-[90%] shadow-[var(--shadow-xl)] text-center">
                <h3 className="text-[var(--font-size-lg)] font-semibold text-[var(--color-text-primary)] mb-2">{strings.subscription.upgradeTitle}</h3>
                <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)] mb-6">
                    {strings.subscription.upgradeMessage} {featureName}
                </p>
                <div className="flex flex-col gap-2">
                    <button className="bg-[var(--color-primary)] text-[var(--header-text)] border-none rounded-md py-2 px-6 text-[var(--font-size-sm)] font-medium cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-primary-hover)]" onClick={onUpgrade}>
                        {strings.subscription.upgradeCta}
                    </button>
                    <button className="bg-transparent border-none text-[var(--color-text-secondary)] text-[var(--font-size-sm)] cursor-pointer p-1 hover:text-[var(--color-text-primary)]" onClick={onDismiss}>
                        {strings.subscription.dismissUpgrade}
                    </button>
                </div>
            </div>
        </div>
    );
}
