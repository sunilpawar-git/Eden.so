/**
 * UtilsBarLayout — SSOT for dual-deck toolbar configuration.
 * Defines action IDs, deck assignment, ordering, defaults, and validation.
 *
 * Layout stores ORDERED arrays per deck so the user-defined arrangement
 * is preserved and reflected in the NodeUtilsBar.
 */

/** Every action that can appear in the node utils bar */
export type UtilsBarActionId =
    | 'ai' | 'connect' | 'copy' | 'pin' | 'delete'
    | 'tags' | 'image' | 'duplicate' | 'focus' | 'collapse' | 'color' | 'share'
    | 'pool';

/** Which deck (horizontal bar) an action is assigned to */
export type UtilsBarDeck = 1 | 2;

/**
 * Maps each deck to its ordered list of action IDs.
 * Ordering within each array determines rendering order in the NodeUtilsBar.
 */
export interface UtilsBarLayout {
    deck1: UtilsBarActionId[];
    deck2: UtilsBarActionId[];
}

/** Complete ordered list of all action IDs (used for validation and fallback) */
export const ALL_ACTION_IDS: readonly UtilsBarActionId[] = [
    'ai', 'connect', 'copy', 'pin', 'delete',
    'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool',
] as const;

/** Minimum actions allowed per deck (prevents empty or single-button bars) */
export const MIN_ACTIONS_PER_DECK = 2;

/** Default layout: primary actions in deck 1, secondary in deck 2 */
export const DEFAULT_UTILS_BAR_LAYOUT: UtilsBarLayout = {
    deck1: ['ai', 'connect', 'copy', 'pin', 'delete'],
    deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
};

const ALL_ACTION_IDS_SET = new Set<string>(ALL_ACTION_IDS);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates a value from localStorage as a valid UtilsBarLayout.
 * Defense-in-depth: rejects tampered, incomplete, malformed, or
 * prototype-polluted data.
 * Rules:
 *  - Must be an object with exactly "deck1" and "deck2" array keys
 *  - Combined entries must cover every action ID exactly once
 *  - No unknown, dangerous, or duplicate action IDs
 *  - No non-string values
 */
export function isValidUtilsBarLayout(value: unknown): value is UtilsBarLayout {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);

    if (keys.length !== 2 || !keys.includes('deck1') || !keys.includes('deck2')) {
        return false;
    }

    const deck1 = record.deck1;
    const deck2 = record.deck2;

    if (!Array.isArray(deck1) || !Array.isArray(deck2)) {
        return false;
    }

    if ((deck1 as unknown[]).length + (deck2 as unknown[]).length !== ALL_ACTION_IDS.length) {
        return false;
    }

    const combined: unknown[] = (deck1 as unknown[]).concat(deck2 as unknown[]);

    // All entries must be strings, valid action IDs, and non-dangerous
    for (const item of combined) {
        if (typeof item !== 'string') return false;
        if (DANGEROUS_KEYS.has(item)) return false;
        if (!ALL_ACTION_IDS_SET.has(item)) return false;
    }

    // No duplicates (combined set size must equal total count)
    if (new Set(combined).size !== ALL_ACTION_IDS.length) {
        return false;
    }

    // Each deck must meet the minimum action count
    if ((deck1 as unknown[]).length < MIN_ACTIONS_PER_DECK || (deck2 as unknown[]).length < MIN_ACTIONS_PER_DECK) {
        return false;
    }

    return true;
}

/** Counts how many actions are in each deck */
export function countActionsPerDeck(layout: UtilsBarLayout): { deck1: number; deck2: number } {
    return { deck1: layout.deck1.length, deck2: layout.deck2.length };
}
