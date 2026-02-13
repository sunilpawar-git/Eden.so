/**
 * Storage Quota Service - Monitors IndexedDB/Cache storage usage
 * SOLID SRP: Only reports storage quota and usage metrics
 */

export interface StorageQuotaInfo {
    usageBytes: number;
    quotaBytes: number;
    percentUsed: number;
    isAvailable: boolean;
}

function isStorageManagerAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage;
}

async function getQuotaInfo(): Promise<StorageQuotaInfo> {
    if (!isStorageManagerAvailable()) {
        return { usageBytes: 0, quotaBytes: 0, percentUsed: 0, isAvailable: false };
    }

    try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        const percent = quota > 0 ? (usage / quota) * 100 : 0;

        return {
            usageBytes: usage,
            quotaBytes: quota,
            percentUsed: Math.round(percent * 100) / 100,
            isAvailable: true,
        };
    } catch {
        return { usageBytes: 0, quotaBytes: 0, percentUsed: 0, isAvailable: false };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(1)} ${units[i]}`;
}

export const storageQuotaService = {
    isStorageManagerAvailable,
    getQuotaInfo,
    formatBytes,
};
