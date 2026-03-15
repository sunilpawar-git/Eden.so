/**
 * CoachMark — spotlight coach mark with optional "Try:" action prompt.
 * Portal-rendered; dismissible via Escape or Skip button.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import clsx from 'clsx';
import type { OnboardingPlacement } from '../types/onboarding';

export interface CoachMarkProps {
    readonly targetSelector: string;
    readonly title: string;
    readonly description: string;
    readonly tryPrompt?: string;
    readonly placement: OnboardingPlacement;
    readonly stepLabel: string;
    readonly onNext: () => void;
    readonly onSkip: () => void;
    readonly nextLabel: string;
    readonly skipLabel: string;
}

const PAD = 6;

function computePosition(rect: DOMRect, placement: OnboardingPlacement): React.CSSProperties {
    const gap = PAD + 12;
    switch (placement) {
        case 'right': return { position: 'fixed', left: rect.right + gap, top: rect.top };
        case 'left': return { position: 'fixed', right: window.innerWidth - rect.left + gap, top: rect.top };
        case 'bottom': return { position: 'fixed', left: rect.left, top: rect.bottom + gap };
        case 'top': return { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + gap };
    }
}

export const CoachMark = React.memo(function CoachMark(props: CoachMarkProps) {
    const { targetSelector, title, description, tryPrompt, placement,
        stepLabel, onNext, onSkip, nextLabel, skipLabel } = props;

    const [rect, setRect] = useState<DOMRect | null>(null);
    const markRef = useRef<HTMLDivElement>(null);

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onSkip);

    useEffect(() => {
        const target = document.querySelector(targetSelector);
        if (!target) return;
        const update = () => {
            const newRect = target.getBoundingClientRect();
            setRect(prev => {
                // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
                if (!prev || prev.x !== newRect.x || prev.y !== newRect.y || prev.width !== newRect.width || prev.height !== newRect.height) {
                    return newRect;
                }
                return prev;
            });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(target);
        window.addEventListener('resize', update, { passive: true });
        return () => { ro.disconnect(); window.removeEventListener('resize', update); };
    }, [targetSelector]);

    useEffect(() => { markRef.current?.focus(); }, []);

    const handleNext = useCallback(() => onNext(), [onNext]);
    const handleSkip = useCallback(() => onSkip(), [onSkip]);

    if (!rect) return null;

    const { left: l, top: t, right: r, bottom: b } = rect;
    const clipPath =
        `polygon(0% 0%,0% 100%,${l - PAD}px 100%,${l - PAD}px ${t - PAD}px,` +
        `${r + PAD}px ${t - PAD}px,${r + PAD}px ${b + PAD}px,` +
        `${l - PAD}px ${b + PAD}px,${l - PAD}px 100%,100% 100%,100% 0%)`;

    const arrowClasses: Record<OnboardingPlacement, string> = {
        right: 'before:content-[""] before:absolute before:left-[-7px] before:top-[14px] before:border-y-[7px] before:border-y-transparent before:border-r-[7px] before:border-r-[var(--color-surface-elevated)]',
        left: 'before:content-[""] before:absolute before:right-[-7px] before:top-[14px] before:border-y-[7px] before:border-y-transparent before:border-l-[7px] before:border-l-[var(--color-surface-elevated)]',
        bottom: 'before:content-[""] before:absolute before:top-[-7px] before:left-[14px] before:border-x-[7px] before:border-x-transparent before:border-b-[7px] before:border-b-[var(--color-surface-elevated)]',
        top: 'before:content-[""] before:absolute before:bottom-[-7px] before:left-[14px] before:border-x-[7px] before:border-x-transparent before:border-t-[7px] before:border-t-[var(--color-surface-elevated)]',
    };

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black/55 z-[var(--z-modal)] pointer-events-none"
                style={{ clipPath }}
                aria-hidden="true"
                data-testid="coach-mark-backdrop"
            />
            <div
                ref={markRef}
                className={clsx(
                    'fixed z-[calc(var(--z-modal)+1)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-6 max-w-[280px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] pointer-events-auto outline-none',
                    arrowClasses[placement]
                )}
                style={computePosition(rect, placement)}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                data-testid="coach-mark"
            >
                <span className="text-[var(--color-text-muted)] text-[var(--font-size-xs)] block mb-1">{stepLabel}</span>
                <h3 className="text-[var(--color-text-primary)] text-[var(--font-size-md)] font-semibold m-0 mb-1">{title}</h3>
                <p className="text-[var(--color-text-secondary)] text-[var(--font-size-sm)] leading-[var(--line-height-normal)] m-0">{description}</p>
                {tryPrompt && (
                    <p className="mt-1 py-1 px-2 bg-[var(--color-primary-light)] rounded-sm text-[var(--color-primary)] text-[var(--font-size-xs)] font-medium mb-0" data-testid="try-prompt">{tryPrompt}</p>
                )}
                <div className="flex justify-between items-center gap-2 mt-4">
                    <button className="bg-transparent text-[var(--color-text-muted)] border-none text-[var(--font-size-sm)] cursor-pointer p-0 hover:text-[var(--color-text-secondary)]" onClick={handleSkip} type="button">
                        {skipLabel}
                    </button>
                    <button className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-none rounded-md py-1 px-4 text-[var(--font-size-sm)] font-medium cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-primary-hover)]" onClick={handleNext} type="button">
                        {nextLabel}
                    </button>
                </div>
            </div>
        </>,
        document.body,
    );
});
