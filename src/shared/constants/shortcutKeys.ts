/**
 * Reserved global shortcut keys (SSOT)
 * Keys in this set are handled by the global useKeyboardShortcuts hook
 * and must NOT be intercepted by node-level input handlers.
 */
export const GLOBAL_SHORTCUT_KEYS: ReadonlySet<string> = new Set(['n']);
