/**
 * UpgradePrompt - Shown when free users try to access pro features
 * All text from strings.subscription.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';
import styles from './UpgradePrompt.module.css';

interface UpgradePromptProps {
    featureName: string;
    onDismiss: () => void;
    onUpgrade?: () => void;
}

export function UpgradePrompt({ featureName, onDismiss, onUpgrade }: UpgradePromptProps) {
    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.prompt}>
                <h3 className={styles.title}>{strings.subscription.upgradeTitle}</h3>
                <p className={styles.message}>
                    {strings.subscription.upgradeMessage} {featureName}
                </p>
                <div className={styles.actions}>
                    <button className={styles.upgradeButton} onClick={onUpgrade}>
                        {strings.subscription.upgradeCta}
                    </button>
                    <button className={styles.dismissButton} onClick={onDismiss}>
                        {strings.subscription.dismissUpgrade}
                    </button>
                </div>
            </div>
        </div>
    );
}
