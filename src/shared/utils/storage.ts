/**
 * Storage Utilities - Shared localStorage helpers
 * SSOT for all localStorage access patterns
 */

/** Safely read a typed value from localStorage */
export function getStorageItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;

        if (typeof defaultValue === 'boolean') {
            return (item === 'true') as T;
        }
        if (typeof defaultValue === 'number') {
            const parsed = parseInt(item, 10);
            return (isNaN(parsed) ? defaultValue : parsed) as T;
        }
        return item as T;
    } catch {
        return defaultValue;
    }
}

/** Safely write a primitive value to localStorage */
export function setStorageItem(key: string, value: string | number | boolean): void {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        // Silently fail if localStorage is unavailable
    }
}

/** Safely read a JSON-parsed value from localStorage */
export function getStorageJson<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch {
        return defaultValue;
    }
}

/** Safely write a JSON-serialized value to localStorage */
export function setStorageJson(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Silently fail if localStorage is unavailable
    }
}
