/**
 * Loading Fallback - Suspense boundary fallback component
 * Used for lazy-loaded components
 */
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';

interface LoadingFallbackProps {
    /** Optional custom message */
    message?: string;
    /** Full screen overlay mode */
    fullScreen?: boolean;
}

export function LoadingFallback({ 
    message = strings.common.loadingComponent, 
    fullScreen = false 
}: LoadingFallbackProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center gap-4 p-[var(--space-xl)] min-h-[200px]',
                fullScreen && 'fixed inset-0 min-h-screen bg-[var(--color-background)] z-[var(--z-modal)]'
            )}
        >
            <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
            <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">{message}</p>
        </div>
    );
}
