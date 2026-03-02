/**
 * Settings Store Tests — Utils Bar Layout
 * Tests for utilsBarLayout, setUtilsBarActionDeck, reorderUtilsBarAction, resetUtilsBarLayout.
 * Layout shape: { deck1: ActionId[], deck2: ActionId[] }
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

        it('layout.deck1 and layout.deck2 together contain all 13 action IDs', () => {
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            const combined = [...deck1, ...deck2].sort();
            expect(combined).toEqual([...ALL_ACTION_IDS].sort());
        });

        it('default deck1 has 5 actions and deck2 has 8', () => {
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1).toHaveLength(5);
            expect(deck2).toHaveLength(8);
        });
    });

    describe('setUtilsBarActionDeck', () => {
        it('moves an action from deck 1 to deck 2', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1).not.toContain('connect');
            expect(deck2).toContain('connect');
        });

        it('moves an action from deck 2 to deck 1', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('tags', 1);
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1).toContain('tags');
            expect(deck2).not.toContain('tags');
        });

        it('appends moved action to end of target deck', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            const { deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck2[deck2.length - 1]).toBe('connect');
        });

        it('is no-op when action is already in the target deck', () => {
            const before = useSettingsStore.getState().utilsBarLayout;
            useSettingsStore.getState().setUtilsBarActionDeck('ai', 1);
            expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
        });

        it('is no-op when move would leave source deck with fewer than MIN_ACTIONS_PER_DECK', () => {
            // Move ai, connect, copy out of deck1 (leaves pin, delete = 2)
            useSettingsStore.getState().setUtilsBarActionDeck('ai', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('copy', 2);
            const { deck1 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1).toContain('pin');
            expect(deck1).toContain('delete');

            // Trying to move 'pin' would leave only 'delete' in deck1 → blocked
            useSettingsStore.getState().setUtilsBarActionDeck('pin', 2);
            expect(useSettingsStore.getState().utilsBarLayout.deck1).toContain('pin');
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
            expect(stored.deck2).toContain('connect');
        });

        it('does not mutate the previous layout object', () => {
            const before = useSettingsStore.getState().utilsBarLayout;
            const beforeDeck1 = [...before.deck1];
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            expect(before.deck1).toEqual(beforeDeck1);
        });

        it('total action count stays at 13 after move', () => {
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1.length + deck2.length).toBe(ALL_ACTION_IDS.length);
        });
    });

    describe('reorderUtilsBarAction', () => {
        it('reorders an action within deck1', () => {
            const beforeDeck1 = useSettingsStore.getState().utilsBarLayout.deck1;
            const firstId = beforeDeck1[0]!;
            // Move first item to position 2
            useSettingsStore.getState().reorderUtilsBarAction(firstId, 1, 2);
            const afterDeck1 = useSettingsStore.getState().utilsBarLayout.deck1;
            expect(afterDeck1[2]).toBe(firstId);
        });

        it('reorders an action within deck2', () => {
            const beforeDeck2 = useSettingsStore.getState().utilsBarLayout.deck2;
            const lastId = beforeDeck2[beforeDeck2.length - 1]!;
            useSettingsStore.getState().reorderUtilsBarAction(lastId, 2, 0);
            const afterDeck2 = useSettingsStore.getState().utilsBarLayout.deck2;
            expect(afterDeck2[0]).toBe(lastId);
        });

        it('is no-op when moving to the same index within same deck', () => {
            const before = useSettingsStore.getState().utilsBarLayout;
            const firstId = before.deck1[0]!;
            useSettingsStore.getState().reorderUtilsBarAction(firstId, 1, 0);
            expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
        });

        it('moves cross-deck when target deck differs from source deck', () => {
            // Move 'tags' (deck2) to deck1 at index 0
            useSettingsStore.getState().reorderUtilsBarAction('tags', 1, 0);
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1[0]).toBe('tags');
            expect(deck2).not.toContain('tags');
        });

        it('blocks cross-deck move when source deck would drop below MIN_ACTIONS_PER_DECK', () => {
            // Shrink deck1 to exactly MIN_ACTIONS_PER_DECK
            useSettingsStore.getState().setUtilsBarActionDeck('ai', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('connect', 2);
            useSettingsStore.getState().setUtilsBarActionDeck('copy', 2);
            // Now deck1 has ['pin', 'delete'] = 2 = MIN
            const before = useSettingsStore.getState().utilsBarLayout;
            useSettingsStore.getState().reorderUtilsBarAction('pin', 2, 0);
            expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
        });

        it('persists to localStorage after reorder', () => {
            localStorageMock.setItem.mockClear();
            useSettingsStore.getState().reorderUtilsBarAction('ai', 1, 2);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-utilsBarLayout',
                expect.any(String),
            );
        });

        it('total action count stays at 13 after cross-deck reorder', () => {
            useSettingsStore.getState().reorderUtilsBarAction('tags', 1, 0);
            const { deck1, deck2 } = useSettingsStore.getState().utilsBarLayout;
            expect(deck1.length + deck2.length).toBe(ALL_ACTION_IDS.length);
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
            const custom: typeof DEFAULT_UTILS_BAR_LAYOUT = {
                deck1: ['ai', 'connect'],
                deck2: ['copy', 'pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            };
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify(custom);
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout.deck1).toEqual(['ai', 'connect']);
        });

        it('falls back to defaults on corrupted JSON', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return '{corrupted';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on old Record format', () => {
            // Old format: { ai: 1, connect: 1, ... }
            const oldFormat = { ai: 1, connect: 1, copy: 1, pin: 1, delete: 1, tags: 2, image: 2, duplicate: 2, focus: 2, collapse: 2, color: 2, share: 2, pool: 2 };
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify(oldFormat);
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on missing deck2', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') return JSON.stringify({ deck1: ['ai'] });
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on XSS payload', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') {
                    return JSON.stringify({ deck1: ['<script>alert(1)</script>'], deck2: [] });
                }
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().utilsBarLayout).toEqual(DEFAULT_UTILS_BAR_LAYOUT);
        });

        it('falls back to defaults on duplicate action IDs', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-utilsBarLayout') {
                    return JSON.stringify({ deck1: ['ai', 'ai', 'connect', 'pin', 'delete'], deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'] });
                }
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
