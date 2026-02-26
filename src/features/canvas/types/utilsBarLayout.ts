/**
 * UtilsBarLayout — SSOT for dual-deck toolbar configuration.
 * Defines action IDs, deck assignment types, defaults, and validation.
 */

/** Every action that can appear in the node utils bar */
export type UtilsBarActionId =
    | 'ai' | 'connect' | 'copy' | 'pin' | 'delete'
    | 'tags' | 'image' | 'duplicate' | 'focus' | 'collapse' | 'color' | 'share';

/** Which deck (horizontal bar) an action is assigned to */
export type UtilsBarDeck = 1 | 2;

/** Maps every action to its assigned deck */
export type UtilsBarLayout = Record<UtilsBarActionId, UtilsBarDeck>;

/** Ordered list of all action IDs (determines render order within each deck) */
export const ALL_ACTION_IDS: readonly UtilsBarActionId[] = [
    'ai', 'connect', 'copy', 'pin', 'delete',
    'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share',
] as const;

/** Minimum actions allowed per deck (prevents empty or single-button bars) */
export const MIN_ACTIONS_PER_DECK = 2;

/** Default layout: quick actions in deck 1, secondary in deck 2 */
export const DEFAULT_UTILS_BAR_LAYOUT: UtilsBarLayout = {
    ai: 1,
    connect: 1,
    copy: 1,
    pin: 1,
    delete: 1,
    tags: 2,
    image: 2,
    duplicate: 2,
    focus: 2,
    collapse: 2,
    color: 2,
    share: 2,
};

const ALL_ACTION_IDS_SET = new Set<string>(ALL_ACTION_IDS);
const VALID_DECKS = new Set<number>([1, 2]);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates a value from localStorage as a valid UtilsBarLayout.
 * Defense-in-depth: rejects tampered, incomplete, malformed, or
 * prototype-polluted data (e.g. __proto__, constructor, prototype keys).
 */
export function isValidUtilsBarLayout(value: unknown): value is UtilsBarLayout {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== ALL_ACTION_IDS.length) return false;

    for (const key of keys) {
        if (DANGEROUS_KEYS.has(key)) return false;
        if (!ALL_ACTION_IDS_SET.has(key)) return false;
    }

    for (const id of ALL_ACTION_IDS) {
        if (!(id in record)) return false;
        if (!VALID_DECKS.has(record[id] as number)) return false;
    }

    return true;
}

/** Counts how many actions are in each deck */
export function countActionsPerDeck(layout: UtilsBarLayout): { deck1: number; deck2: number } {
    let deck1 = 0;
    let deck2 = 0;
    for (const id of ALL_ACTION_IDS) {
        if (layout[id] === 1) deck1++;
        else deck2++;
    }
    return { deck1, deck2 };
}
