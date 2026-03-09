/**
 * WelcomeScreen — full-screen first-visit overlay.
 * Portal-rendered; dismissed by CTA or Escape.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { strings } from '@/shared/localization/strings';
import styles from './WelcomeScreen.module.css';

interface WelcomeScreenProps {
    readonly onDismiss: () => void;
}

export const WelcomeScreen = React.memo(function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onDismiss);

    return createPortal(
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-welcome-title"
            data-testid="welcome-screen"
        >
            <div className={styles.card}>
                <div className={styles.logoRow}>
                    <span className={styles.appName}>{strings.app.name}</span>
                </div>

                <span className={styles.badge}>{strings.onboarding.welcome.earlyAccess}</span>

                <h1 id="onboarding-welcome-title" className={styles.title}>{strings.onboarding.welcome.title}</h1>

                <p className={styles.intro}>{strings.onboarding.welcome.intro}</p>

                <ul className={styles.bullets}>
                    <li>{strings.onboarding.welcome.bullet1}</li>
                    <li>{strings.onboarding.welcome.bullet2}</li>
                    <li>{strings.onboarding.welcome.bullet3}</li>
                </ul>

                <button
                    className={styles.cta}
                    onClick={onDismiss}
                    autoFocus
                    type="button"
                >
                    {strings.onboarding.welcome.ctaLabel}
                </button>
            </div>
        </div>,
        document.body,
    );
});
