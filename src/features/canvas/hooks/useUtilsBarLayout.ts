/**
 * useUtilsBarLayout — Derives deck 1 and deck 2 action lists from settings store.
 * Single Zustand selector, memoized output to prevent unnecessary re-renders.
 */
import { useMemo } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ALL_ACTION_IDS } from '../types/utilsBarLayout';
import type { UtilsBarActionId, UtilsBarLayout } from '../types/utilsBarLayout';

export interface UtilsBarLayoutResult {
    deckOneActions: UtilsBarActionId[];
    deckTwoActions: UtilsBarActionId[];
}

function splitByDeck(layout: UtilsBarLayout): UtilsBarLayoutResult {
    const deckOneActions: UtilsBarActionId[] = [];
    const deckTwoActions: UtilsBarActionId[] = [];
    for (const id of ALL_ACTION_IDS) {
        if (layout[id] === 1) deckOneActions.push(id);
        else deckTwoActions.push(id);
    }
    return { deckOneActions, deckTwoActions };
}

export function useUtilsBarLayout(): UtilsBarLayoutResult {
    const layout = useSettingsStore((state) => state.utilsBarLayout);
    return useMemo(() => splitByDeck(layout), [layout]);
}
