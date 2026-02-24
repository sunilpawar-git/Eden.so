/**
 * Firebase/Firestore utilities shared across the application.
 */

/**
 * Recursively removes undefined values from objects for Firestore compatibility.
 * Firebase rejects undefined at ANY depth.
 * Skips arrays, Dates, null, and primitive values.
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
                k,
                typeof v === 'object' && v && !Array.isArray(v) && !(v instanceof Date)
                    ? removeUndefined(v as Record<string, unknown>)
                    : v,
            ])
    ) as T;
}
