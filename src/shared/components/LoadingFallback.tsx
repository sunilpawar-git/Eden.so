/**
 * Loading Fallback - Suspense boundary fallback component
 * Used for lazy-loaded components
 */
import { strings } from '@/shared/localization/strings';
import styles from './LoadingFallback.module.css';

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
    const containerClass = fullScreen 
        ? `${styles.container} ${styles.fullScreen}` 
        : styles.container;

    return (
        <div className={containerClass}>
            <div className={styles.spinner} />
            <p className={styles.message}>{message}</p>
        </div>
    );
}
