/**
 * useUtilsBarLayout Tests — Deck splitting and memoization.
 * Layout shape: { deck1: ActionId[], deck2: ActionId[] }
 * The hook directly returns the stored arrays (no re-splitting needed).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUtilsBarLayout } from '../useUtilsBarLayout';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ALL_ACTION_IDS, DEFAULT_UTILS_BAR_LAYOUT } from '../../types/utilsBarLayout';
import type { UtilsBarLayout } from '../../types/utilsBarLayout';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();
const mockMatchMedia = createMockMatchMedia();

describe('useUtilsBarLayout', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('returns correct split for default layout', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toEqual(DEFAULT_UTILS_BAR_LAYOUT.deck1);
        expect(result.current.deckTwoActions).toEqual(DEFAULT_UTILS_BAR_LAYOUT.deck2);
    });

    it('covers all action IDs across both decks', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        const all = [...result.current.deckOneActions, ...result.current.deckTwoActions];
        expect(all.sort()).toEqual([...ALL_ACTION_IDS].sort());
    });

    it('updates when store layout changes (move action to deck 2)', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toContain('connect');

        act(() => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        });

        expect(result.current.deckOneActions).not.toContain('connect');
        expect(result.current.deckTwoActions).toContain('connect');
    });

    it('preserves stored order within each deck', () => {
        const customLayout: UtilsBarLayout = {
            deck1: ['delete', 'ai', 'pin'],
            deck2: ['connect', 'copy', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
        };
        act(() => { useSettingsStore.setState({ utilsBarLayout: customLayout }); });

        const { result } = renderHook(() => useUtilsBarLayout());
        // Order must match the stored arrays, not ALL_ACTION_IDS order
        expect(result.current.deckOneActions).toEqual(['delete', 'ai', 'pin']);
    });

    it('returns stable references on re-render when layout has not changed', () => {
        const { result, rerender } = renderHook(() => useUtilsBarLayout());
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    it('handles all-deck-1 layout', () => {
        const allDeck1: UtilsBarLayout = { deck1: [...ALL_ACTION_IDS], deck2: [] };
        act(() => { useSettingsStore.setState({ utilsBarLayout: allDeck1 }); });

        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toHaveLength(13);
        expect(result.current.deckTwoActions).toHaveLength(0);
    });

    it('handles all-deck-2 layout', () => {
        const allDeck2: UtilsBarLayout = { deck1: [], deck2: [...ALL_ACTION_IDS] };
        act(() => { useSettingsStore.setState({ utilsBarLayout: allDeck2 }); });

        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toHaveLength(0);
        expect(result.current.deckTwoActions).toHaveLength(13);
    });

    it('updates after reorderUtilsBarAction within deck', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        const firstId = result.current.deckOneActions[0]!;

        act(() => {
            useSettingsStore.getState().reorderUtilsBarAction(firstId, 1, 2);
        });

        expect(result.current.deckOneActions[2]).toBe(firstId);
    });

    it('handles reset to defaults', () => {
        act(() => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        });

        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckTwoActions).toContain('connect');

        act(() => {
            useSettingsStore.getState().resetUtilsBarLayout();
        });

        expect(result.current.deckOneActions).toEqual(DEFAULT_UTILS_BAR_LAYOUT.deck1);
        expect(result.current.deckTwoActions).toEqual(DEFAULT_UTILS_BAR_LAYOUT.deck2);
    });
});
