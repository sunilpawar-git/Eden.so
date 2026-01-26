/**
 * Toast Container Component - Renders notifications
 */
import { useToastStore } from '../stores/toastStore';
import styles from './Toast.module.css';

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map((t) => (
                <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                    <span className={styles.message}>{t.message}</span>
                    <button
                        className={styles.close}
                        onClick={() => removeToast(t.id)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
