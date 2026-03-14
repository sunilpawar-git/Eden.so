/**
 * Reserved global shortcut keys (SSOT)
 * Keys in this set are handled by the global useKeyboardShortcuts hook
 * and must NOT be intercepted by node-level input handlers.
 *
 * All entries MUST be lowercase. The set is consumed via toLowerKey(e.key)
 * so uppercase variants are handled automatically.
 */
export const GLOBAL_SHORTCUT_KEYS: ReadonlySet<Lowercase<string>> = new Set<Lowercase<string>>(['n']);

/**
 * Type-safe toLowerCase for keyboard event keys.
 *
 * TypeScript cannot narrow `String.prototype.toLowerCase()` to
 * `Lowercase<string>` without an explicit cast or type predicate.
 * This helper centralises the cast to a single, documented location
 * instead of scattering `as Lowercase<string>` at every call site.
 */
export function toLowerKey(key: string): Lowercase<string> {
    return key.toLowerCase() as Lowercase<string>;
}
