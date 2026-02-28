/**
 * UtilsBarLayout Slice — Extracted store logic for toolbar layout.
 * Keeps the main settingsStore create function under max-lines-per-function.
 * Handles deck assignment, ordering, validation, and persistence.
 */
import { getStorageJson, setStorageJson } from '@/shared/utils/storage';
import {
    DEFAULT_UTILS_BAR_LAYOUT,
    MIN_ACTIONS_PER_DECK,
    isValidUtilsBarLayout,
} from '@/features/canvas/types/utilsBarLayout';
import type { UtilsBarActionId, UtilsBarDeck, UtilsBarLayout } from '@/features/canvas/types/utilsBarLayout';

const STORAGE_KEY = 'settings-utilsBarLayout';

/** Reads and validates layout from localStorage, falls back to defaults */
export function loadUtilsBarLayout(): UtilsBarLayout {
    const stored = getStorageJson<unknown>(STORAGE_KEY, null);
    return isValidUtilsBarLayout(stored) ? stored : DEFAULT_UTILS_BAR_LAYOUT;
}

/**
 * Moves an action to a different deck (appended to the end).
 * Returns null if the action is already in the target deck, or if the
 * source deck would drop below MIN_ACTIONS_PER_DECK.
 */
export function computeNextLayout(
    current: UtilsBarLayout,
    actionId: UtilsBarActionId,
    deck: UtilsBarDeck,
): UtilsBarLayout | null {
    const isInDeck1 = current.deck1.includes(actionId);
    const sourceDeckKey = isInDeck1 ? 'deck1' : 'deck2';
    const targetDeckKey = deck === 1 ? 'deck1' : 'deck2';

    if (sourceDeckKey === targetDeckKey) return null;

    const sourceArr = current[sourceDeckKey];
    if (sourceArr.length <= MIN_ACTIONS_PER_DECK) return null;

    const newSource = sourceArr.filter((id) => id !== actionId);
    const newTarget = [...current[targetDeckKey], actionId];

    return deck === 1
        ? { deck1: newTarget, deck2: newSource }
        : { deck1: newSource, deck2: newTarget };
}

/**
 * Reorders an action within its deck or moves it to another deck at a target index.
 * For cross-deck moves, enforces MIN_ACTIONS_PER_DECK on the source deck.
 * Returns null if no change would occur.
 */
export function computeReorder(
    current: UtilsBarLayout,
    actionId: UtilsBarActionId,
    targetDeck: UtilsBarDeck,
    targetIndex: number,
): UtilsBarLayout | null {
    const isInDeck1 = current.deck1.includes(actionId);
    const sourceDeckKey = isInDeck1 ? 'deck1' : 'deck2';
    const targetDeckKey = targetDeck === 1 ? 'deck1' : 'deck2';
    const sourceArr = current[sourceDeckKey];
    const targetArr = current[targetDeckKey];

    if (sourceDeckKey === targetDeckKey) {
        const fromIndex = sourceArr.indexOf(actionId);
        if (fromIndex === targetIndex) return null;
        const newArr = [...sourceArr];
        newArr.splice(fromIndex, 1);
        newArr.splice(targetIndex, 0, actionId);
        return { ...current, [sourceDeckKey]: newArr };
    }

    // Cross-deck: enforce minimum
    if (sourceArr.length <= MIN_ACTIONS_PER_DECK) return null;

    const newSource = sourceArr.filter((id) => id !== actionId);
    const newTarget = [...targetArr];
    const safeIndex = Math.max(0, Math.min(targetIndex, newTarget.length));
    newTarget.splice(safeIndex, 0, actionId);

    return sourceDeckKey === 'deck1'
        ? { deck1: newSource, deck2: newTarget }
        : { deck1: newTarget, deck2: newSource };
}

/** Persists layout to localStorage */
export function persistUtilsBarLayout(layout: UtilsBarLayout): void {
    setStorageJson(STORAGE_KEY, layout);
}
