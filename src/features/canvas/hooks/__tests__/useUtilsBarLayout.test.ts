/**
 * useUtilsBarLayout Tests — Deck splitting and memoization.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUtilsBarLayout } from '../useUtilsBarLayout';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ALL_ACTION_IDS } from '../../types/utilsBarLayout';
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
        expect(result.current.deckOneActions).toEqual(['ai', 'connect', 'copy', 'pin', 'delete']);
        expect(result.current.deckTwoActions).toEqual([
            'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share',
        ]);
    });

    it('covers all action IDs across both decks', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        const all = [...result.current.deckOneActions, ...result.current.deckTwoActions];
        expect(all.sort()).toEqual([...ALL_ACTION_IDS].sort());
    });

    it('updates when store layout changes', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toContain('connect');

        act(() => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
        });

        expect(result.current.deckOneActions).not.toContain('connect');
        expect(result.current.deckTwoActions).toContain('connect');
    });

    it('maintains action order from ALL_ACTION_IDS', () => {
        const { result } = renderHook(() => useUtilsBarLayout());
        const deck1Indices = result.current.deckOneActions.map((id) => ALL_ACTION_IDS.indexOf(id));
        const deck2Indices = result.current.deckTwoActions.map((id) => ALL_ACTION_IDS.indexOf(id));

        for (let i = 1; i < deck1Indices.length; i++) {
            expect(deck1Indices[i] as number).toBeGreaterThan(deck1Indices[i - 1] as number);
        }
        for (let i = 1; i < deck2Indices.length; i++) {
            expect(deck2Indices[i] as number).toBeGreaterThan(deck2Indices[i - 1] as number);
        }
    });

    it('returns stable references on re-render when layout has not changed', () => {
        const { result, rerender } = renderHook(() => useUtilsBarLayout());
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    it('handles all-deck-1 layout', () => {
        const allDeck1 = Object.fromEntries(
            ALL_ACTION_IDS.map((id) => [id, 1]),
        ) as UtilsBarLayout;
        act(() => { useSettingsStore.setState({ utilsBarLayout: allDeck1 }); });

        const { result } = renderHook(() => useUtilsBarLayout());
        expect(result.current.deckOneActions).toHaveLength(12);
        expect(result.current.deckTwoActions).toHaveLength(0);
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

        expect(result.current.deckOneActions).toEqual(['ai', 'connect', 'copy', 'pin', 'delete']);
    });
});
