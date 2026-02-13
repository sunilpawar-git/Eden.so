/**
 * OfflineFallback - Full-page fallback shown when offline with no cached data
 * Probes both IDB cache (via prop) and SW Cache API for offline data awareness.
 * All text from strings.offlineFallback.* -- no hardcoded strings.
 */
import { useState, useEffect } from 'react';
import { swCacheService } from '@/shared/services/swCacheService';
import { strings } from '@/shared/localization/strings';
import styles from './OfflineFallback.module.css';

const FIRESTORE_CACHE_PROBE_URL = 'https://firestore.googleapis.com';

interface OfflineFallbackProps {
    /** Whether any cached workspace data exists (from IDB/memory) */
    hasOfflineData: boolean;
    /** Called when user clicks retry */
    onRetry: () => void;
}

export function OfflineFallback({ hasOfflineData, onRetry }: OfflineFallbackProps) {
    const [hasSwCache, setHasSwCache] = useState(false);

    // Probe SW Cache API for cached Firestore responses
    useEffect(() => {
        void swCacheService.getFromCache(
            FIRESTORE_CACHE_PROBE_URL, 'firestore-api'
        ).then((cached) => {
            if (cached) setHasSwCache(true);
        });
    }, []);

    const hasCachedData = hasOfflineData || hasSwCache;

    const title = hasCachedData
        ? strings.offlineFallback.title
        : strings.offlineFallback.noDataTitle;

    const message = hasCachedData
        ? strings.offlineFallback.message
        : strings.offlineFallback.noDataMessage;

    return (
        <div className={styles.container} role="alert">
            <div className={styles.content}>
                <div className={styles.icon} aria-hidden="true">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>
                <button className={styles.retryButton} onClick={onRetry}>
                    {strings.offlineFallback.retryButton}
                </button>
            </div>
        </div>
    );
}
