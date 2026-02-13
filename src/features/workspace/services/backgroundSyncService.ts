/**
 * Background Sync Service - Registers Background Sync via Service Worker
 * SOLID SRP: Only manages Background Sync registration/detection
 * Falls back gracefully when Background Sync API is unavailable.
 */

const SYNC_TAG = 'offline-queue-sync';

function isBackgroundSyncSupported(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        'SyncManager' in globalThis
    );
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
}

async function registerSync(): Promise<boolean> {
    if (!isBackgroundSyncSupported()) return false;

    try {
        const registration = await getRegistration();
        if (!registration) return false;

        await registration.sync.register(SYNC_TAG);
        return true;
    } catch {
        return false;
    }
}

async function hasPendingSync(): Promise<boolean> {
    if (!isBackgroundSyncSupported()) return false;

    try {
        const registration = await getRegistration();
        if (!registration) return false;

        const tags = await registration.sync.getTags();
        return tags.includes(SYNC_TAG);
    } catch {
        return false;
    }
}

export const backgroundSyncService = {
    isBackgroundSyncSupported,
    registerSync,
    hasPendingSync,
    SYNC_TAG,
};
