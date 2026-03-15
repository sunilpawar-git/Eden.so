/**
 * ConfirmDialog - A global, async-compatible confirmation modal
 * Replaces window.confirm for a non-blocking, themed UX.
 */
import clsx from 'clsx';
import { useConfirmStore } from '@/shared/stores/confirmStore';
import { strings } from '@/shared/localization/strings';

export function ConfirmDialog() {
    const isOpen = useConfirmStore((s) => s.isOpen);
    const options = useConfirmStore((s) => s.options);

    if (!isOpen || !options) return null;

    const handleConfirm = () => useConfirmStore.getState().handleConfirm();
    const handleCancel = () => useConfirmStore.getState().handleCancel();

    const {
        title,
        message,
        confirmText = strings.common.confirm,
        cancelText = strings.common.cancel,
        isDestructive = false,
    } = options;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-[var(--z-modal)] animate-[fadeIn_0.15s_ease-out_forwards]"
            onClick={handleCancel}
            role="presentation"
        >
            <div
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-xl)] max-w-[400px] w-[90%] animate-[slideUpSmall_0.15s_ease-out_forwards]"
                style={{ padding: 'var(--space-xl)' }}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-title" className="text-[var(--font-size-lg)] font-semibold text-[var(--color-text-primary)]" style={{ marginBottom: 8 }}>{title}</h2>
                <p id="confirm-message" className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)] leading-normal" style={{ marginBottom: 'var(--space-xl)' }}>{message}</p>
                <div className="flex justify-end" style={{ gap: 8 }}>
                    <button
                        className="rounded-md text-[var(--font-size-sm)] font-medium text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] transition-all duration-150 ease-in-out hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                        style={{ padding: '8px 24px' }}
                        onClick={handleCancel}
                        autoFocus
                    >
                        {cancelText}
                    </button>
                    <button
                        className={clsx(
                            'rounded-md text-[var(--font-size-sm)] font-medium text-[var(--color-text-on-primary)] transition-colors duration-150 ease-in-out',
                            isDestructive
                                ? 'bg-[var(--color-error)] hover:bg-[var(--color-error-dark,var(--color-error))] hover:opacity-90'
                                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                        )}
                        style={{ padding: '8px 24px' }}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
