/**
 * WelcomeScreen — full-screen first-visit overlay.
 * Portal-rendered; dismissed by CTA or Escape.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { strings } from '@/shared/localization/strings';

interface WelcomeScreenProps {
    readonly onDismiss: () => void;
}

export const WelcomeScreen = React.memo(function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onDismiss);

    return createPortal(
        <div
            className="fixed inset-0 bg-[var(--color-background)] z-[calc(var(--z-modal)+10)] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-welcome-title"
            data-testid="welcome-screen"
        >
            <div className="max-w-[560px] w-full p-[var(--space-2xl)] flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-primary)] text-[var(--font-size-lg)] font-bold tracking-[-0.01em]">{strings.app.name}</span>
                </div>

                <span className="inline-block text-[var(--color-primary)] border border-[var(--color-primary)] rounded-full py-0.5 px-2 text-[var(--font-size-xs)] self-start">{strings.onboarding.welcome.earlyAccess}</span>

                <h1 id="onboarding-welcome-title" className="text-[var(--color-text-primary)] text-[var(--font-size-2xl)] font-bold leading-[var(--line-height-tight)] m-0">{strings.onboarding.welcome.title}</h1>

                <p className="text-[var(--color-text-secondary)] text-[var(--font-size-sm)] m-0">{strings.onboarding.welcome.intro}</p>

                <ul className="text-[var(--color-text-secondary)] text-[var(--font-size-sm)] leading-[var(--line-height-relaxed)] list-disc pl-6 m-0 flex flex-col gap-1">
                    <li>{strings.onboarding.welcome.bullet1}</li>
                    <li>{strings.onboarding.welcome.bullet2}</li>
                    <li>{strings.onboarding.welcome.bullet3}</li>
                </ul>

                <button
                    className="self-start bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-none rounded-md py-2 px-[var(--space-xl)] text-[var(--font-size-md)] font-medium cursor-pointer mt-2 transition-colors duration-150 ease-in-out hover:bg-[var(--color-primary-hover)]"
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
