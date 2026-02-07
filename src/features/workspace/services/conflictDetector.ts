/**
 * Conflict Detector - Detects server vs local timestamp conflicts
 * Pure function: last-writer-wins with user notification.
 * SOLID SRP: Only handles conflict detection logic.
 */

export interface ConflictResult {
    hasConflict: boolean;
    localTimestamp: number;
    serverTimestamp: number;
}

/**
 * Check if the server has newer data than our local cache.
 * A conflict exists when the server timestamp is strictly greater
 * than the local timestamp (server was updated after our last fetch).
 */
export function checkForConflict(
    localUpdatedAt: number,
    serverUpdatedAt: number
): ConflictResult {
    return {
        hasConflict: serverUpdatedAt > localUpdatedAt,
        localTimestamp: localUpdatedAt,
        serverTimestamp: serverUpdatedAt,
    };
}
