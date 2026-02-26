/**
 * UtilsBarLayout Slice — Extracted store logic for toolbar layout.
 * Keeps the main settingsStore create function under max-lines-per-function.
 */
import { getStorageJson, setStorageJson } from '@/shared/utils/storage';
import {
    DEFAULT_UTILS_BAR_LAYOUT,
    MIN_ACTIONS_PER_DECK,
    isValidUtilsBarLayout,
    countActionsPerDeck,
} from '@/features/canvas/types/utilsBarLayout';
import type { UtilsBarActionId, UtilsBarDeck, UtilsBarLayout } from '@/features/canvas/types/utilsBarLayout';

const STORAGE_KEY = 'settings-utilsBarLayout';

/** Reads and validates layout from localStorage, falls back to defaults */
export function loadUtilsBarLayout(): UtilsBarLayout {
    const stored = getStorageJson<unknown>(STORAGE_KEY, null);
    return isValidUtilsBarLayout(stored) ? stored : DEFAULT_UTILS_BAR_LAYOUT;
}

/** Moves an action between decks if MIN_ACTIONS_PER_DECK is not violated */
export function computeNextLayout(
    current: UtilsBarLayout,
    actionId: UtilsBarActionId,
    deck: UtilsBarDeck,
): UtilsBarLayout | null {
    if (current[actionId] === deck) return null;
    const sourceDeck = current[actionId];
    const counts = countActionsPerDeck(current);
    const sourceCount = sourceDeck === 1 ? counts.deck1 : counts.deck2;
    if (sourceCount <= MIN_ACTIONS_PER_DECK) return null;
    return { ...current, [actionId]: deck };
}

/** Persists layout to localStorage */
export function persistUtilsBarLayout(layout: UtilsBarLayout): void {
    setStorageJson(STORAGE_KEY, layout);
}
