/**
 * useUtilsBarLayout — Returns ordered deck action lists from the settings store.
 * The layout now stores arrays directly, so this hook simply reads them.
 * Memoized to prevent unnecessary re-renders.
 */
import { useMemo } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import type { UtilsBarActionId } from '../types/utilsBarLayout';

export interface UtilsBarLayoutResult {
    deckOneActions: UtilsBarActionId[];
    deckTwoActions: UtilsBarActionId[];
}

export function useUtilsBarLayout(): UtilsBarLayoutResult {
    const deck1 = useSettingsStore((state) => state.utilsBarLayout.deck1);
    const deck2 = useSettingsStore((state) => state.utilsBarLayout.deck2);
    return useMemo(() => ({ deckOneActions: deck1, deckTwoActions: deck2 }), [deck1, deck2]);
}
