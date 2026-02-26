/**
 * Settings Store Tests — Utils Bar Layout
 * Tests for utilsBarLayout, setUtilsBarActionDeck, resetUtilsBarLayout.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from './helpers/settingsTestSetup';
import { DEFAULT_UTILS_BAR_LAYOUT, ALL_ACTION_IDS } from '@/features/canvas/types/utilsBarLayout';

const localStorageMock = createLocalStorageMock();
const mockMatchMedia = createMockMatchMedia();

describe('SettingsStore — utilsBarLayout', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    describe('initial state', () => {
        it('initializes with DEFAULT_UTILS_BAR_LAYOUT', () => {
            const state = useSettingsStore.getState();
            expect(state.utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('has all 12 action IDs mapped', () => {
            const layout = useSettingsStore.getState().utilsBarLayout;
            for (const id of ALL_ACTION_IDS) {
                expect(layout[id]).toBeDefined();
            }
        });
    });

    describe('setUtilsBarActionDeck', () => {
        it('moves an action from deck 1 to deck 2', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            expect(useSettingsStore.getState().utilsBarLayout.connect).toBe(2);
        });

        it('moves an action from deck 2 to deck 1', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('tags', 1);
            expect(useSettingsStore.getState().utilsBarLayout.tags).toBe(1);
        });

        it('is no-op when action is already in the target deck', () => {
            const before = useSettingsStore.getState().utilsBarLayout;
            useSettingsStore.getState().setUtilsBarActionDeck('ai', 1);
            expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
        });

        it('is no-op when move would leave source deck with fewer than MIN_ACTIONS_PER_DECK', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('ai', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('copy', 2);
            const stateAfterThreeMoves = useSettingsStore.getState().utilsBarLayout;
            expect(stateAfterThreeMoves.pin).toBe(1);
            expect(stateAfterThreeMoves.delete).toBe(1);

            useSettingsStore.getState().setUtilsBarActionDeck('pin', 2);
            expect(useSettingsStore.getState().utilsBarLayout.pin).toBe(1);
        });

        it('persists to localStorage as JSON', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-utilsBarLayout',
                expect.any(String),
            );
            const stored = JSON.parse(
                localStorageMock.setItem.mock.calls.find(
                    (c: string[]) => c[0] === 'settings-utilsBarLayout',
                )?.[1] ?? '{}',
            );
            expect(stored.connect).toBe(2);
        });

        it('does not mutate the previous layout object', () => {
            const before = useSettingsStore.getState().utilsBarLayout;
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            expect(before.connect).toBe(1);
        });
    });

    describe('resetUtilsBarLayout', () => {
        it('restores DEFAULT_UTILS_BAR_LAYOUT', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            useSettingsStore.getState().resetUtilsBarLayout();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('persists default layout to localStorage', () => {
            useSettingsStore.getState().resetUtilsBarLayout();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-utilsBarLayout',
                JSON.stringify(DEFAULT_UTILS_BAR_LAYOUT),
            );
        });
    });

    describe('loadFromStorage', () => {
        it('loads valid layout from localStorage', () => {
            const custom = { ...DEFAULT_UTILS_BAR_LAYOUT, connect: 2 as const };
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify(custom);
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout.connect).toBe(2);
        });

        it('falls back to defaults on corrupted JSON', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return '{corrupted';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on missing keys', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify({ ai: 1 });
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on XSS payload', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') {
                    return JSON.stringify({ '<script>alert(1)</script>': 1 });
                }
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on invalid deck values', () => {
            const badDeckValues = { ...DEFAULT_UTILS_BAR_LAYOUT, ai: 99 };
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify(badDeckValues);
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults when localStorage returns null', () => {
            localStorageMock.getItem.mockReturnValue(null);
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });
    });
});
