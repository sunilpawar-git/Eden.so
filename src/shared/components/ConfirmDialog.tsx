/**
 * ConfirmDialog - A global, async-compatible confirmation modal
 * Replaces window.confirm for a non-blocking, themed UX.
 */
import { useConfirmStore } from '@/shared/stores/confirmStore';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog() {
    const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

    if (!isOpen || !options) return null;

    const {
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        isDestructive = false,
    } = options;

    return (
        <div className={styles.backdrop} onClick={handleCancel} role="presentation">
            <div
                className={styles.dialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-title" className={styles.title}>{title}</h2>
                <p id="confirm-message" className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button
                        className={styles.cancelButton}
                        onClick={handleCancel}
                        autoFocus
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.confirmButton} ${isDestructive ? styles.destructive : ''}`}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
