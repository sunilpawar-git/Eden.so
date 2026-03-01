/**
 * UtilsBarLayout Tests — SSOT validation, defaults, and security.
 * Layout shape: { deck1: ActionId[], deck2: ActionId[] }
 */
import { describe, it, expect } from 'vitest';
import {
    ALL_ACTION_IDS,
    DEFAULT_UTILS_BAR_LAYOUT,
    MIN_ACTIONS_PER_DECK,
    isValidUtilsBarLayout,
    countActionsPerDeck,
} from '../utilsBarLayout';
import type { UtilsBarLayout } from '../utilsBarLayout';

describe('utilsBarLayout', () => {
    describe('ALL_ACTION_IDS', () => {
        it('contains exactly 13 action IDs', () => {
            expect(ALL_ACTION_IDS).toHaveLength(13);
        });

        it('has no duplicates', () => {
            const unique = new Set(ALL_ACTION_IDS);
            expect(unique.size).toBe(ALL_ACTION_IDS.length);
        });
    });

    describe('DEFAULT_UTILS_BAR_LAYOUT', () => {
        it('is the new array format with deck1 and deck2 properties', () => {
            expect(DEFAULT_UTILS_BAR_LAYOUT).toHaveProperty('deck1');
            expect(DEFAULT_UTILS_BAR_LAYOUT).toHaveProperty('deck2');
            expect(Array.isArray(DEFAULT_UTILS_BAR_LAYOUT.deck1)).toBe(true);
            expect(Array.isArray(DEFAULT_UTILS_BAR_LAYOUT.deck2)).toBe(true);
        });

        it('covers all 13 action IDs across both decks', () => {
            const combined = [...DEFAULT_UTILS_BAR_LAYOUT.deck1, ...DEFAULT_UTILS_BAR_LAYOUT.deck2].sort();
            expect(combined).toEqual([...ALL_ACTION_IDS].sort());
        });

        it('assigns quick actions to deck 1', () => {
            const { deck1 } = DEFAULT_UTILS_BAR_LAYOUT;
            expect(deck1).toContain('ai');
            expect(deck1).toContain('connect');
            expect(deck1).toContain('copy');
            expect(deck1).toContain('pin');
            expect(deck1).toContain('delete');
        });

        it('assigns secondary actions to deck 2', () => {
            const { deck2 } = DEFAULT_UTILS_BAR_LAYOUT;
            expect(deck2).toContain('tags');
            expect(deck2).toContain('image');
            expect(deck2).toContain('duplicate');
            expect(deck2).toContain('focus');
            expect(deck2).toContain('collapse');
            expect(deck2).toContain('color');
            expect(deck2).toContain('share');
            expect(deck2).toContain('pool');
        });

        it('has at least MIN_ACTIONS_PER_DECK in each deck', () => {
            const counts = countActionsPerDeck(DEFAULT_UTILS_BAR_LAYOUT);
            expect(counts.deck1).toBeGreaterThanOrEqual(MIN_ACTIONS_PER_DECK);
            expect(counts.deck2).toBeGreaterThanOrEqual(MIN_ACTIONS_PER_DECK);
        });

        it('passes its own validation', () => {
            expect(isValidUtilsBarLayout(DEFAULT_UTILS_BAR_LAYOUT)).toBe(true);
        });

        it('has no duplicate action IDs', () => {
            const combined = [...DEFAULT_UTILS_BAR_LAYOUT.deck1, ...DEFAULT_UTILS_BAR_LAYOUT.deck2];
            expect(new Set(combined).size).toBe(combined.length);
        });
    });

    describe('MIN_ACTIONS_PER_DECK', () => {
        it('is at least 2', () => {
            expect(MIN_ACTIONS_PER_DECK).toBeGreaterThanOrEqual(2);
        });
    });

    describe('isValidUtilsBarLayout', () => {
        it('accepts a valid layout', () => {
            expect(isValidUtilsBarLayout(DEFAULT_UTILS_BAR_LAYOUT)).toBe(true);
        });

        it('rejects layout with all actions in deck 1 (deck 2 empty, violates MIN_ACTIONS_PER_DECK)', () => {
            const allDeck1: UtilsBarLayout = {
                deck1: [...ALL_ACTION_IDS],
                deck2: [],
            };
            expect(isValidUtilsBarLayout(allDeck1)).toBe(false);
        });

        it('rejects layout with all actions in deck 2 (deck 1 empty, violates MIN_ACTIONS_PER_DECK)', () => {
            const allDeck2: UtilsBarLayout = {
                deck1: [],
                deck2: [...ALL_ACTION_IDS],
            };
            expect(isValidUtilsBarLayout(allDeck2)).toBe(false);
        });

        it('accepts layout where each deck has exactly MIN_ACTIONS_PER_DECK items', () => {
            const boundary: UtilsBarLayout = {
                deck1: ['ai', 'connect'],
                deck2: ['copy', 'pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            };
            expect(isValidUtilsBarLayout(boundary)).toBe(true);
        });

        it('rejects layout where deck1 has one fewer than MIN_ACTIONS_PER_DECK', () => {
            const tooFew: UtilsBarLayout = {
                deck1: ['ai'],
                deck2: ['connect', 'copy', 'pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            };
            expect(isValidUtilsBarLayout(tooFew)).toBe(false);
        });

        it('rejects null', () => {
            expect(isValidUtilsBarLayout(null)).toBe(false);
        });

        it('rejects undefined', () => {
            expect(isValidUtilsBarLayout(undefined)).toBe(false);
        });

        it('rejects an array', () => {
            expect(isValidUtilsBarLayout([1, 2, 3])).toBe(false);
        });

        it('rejects a string', () => {
            expect(isValidUtilsBarLayout('not a layout')).toBe(false);
        });

        it('rejects a number', () => {
            expect(isValidUtilsBarLayout(42)).toBe(false);
        });

        it('rejects empty object', () => {
            expect(isValidUtilsBarLayout({})).toBe(false);
        });

        it('rejects object with only deck1 (missing deck2)', () => {
            expect(isValidUtilsBarLayout({ deck1: [...ALL_ACTION_IDS] })).toBe(false);
        });

        it('rejects object with extra keys beyond deck1 and deck2', () => {
            const extended = { ...DEFAULT_UTILS_BAR_LAYOUT, hacked: [1] };
            expect(isValidUtilsBarLayout(extended)).toBe(false);
        });

        it('rejects layout with wrong total action count', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect'],
                deck2: ['copy'],
            })).toBe(false);
        });

        it('rejects duplicate action IDs across decks', () => {
            const combinedWithDup: UtilsBarLayout = {
                deck1: ['ai', 'ai', 'connect', 'pin', 'delete'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            };
            expect(isValidUtilsBarLayout(combinedWithDup)).toBe(false);
        });

        it('rejects unknown action ID', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect', 'copy', 'pin', 'delete'],
                deck2: ['unknown', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });

        it('rejects non-string values in deck arrays', () => {
            expect(isValidUtilsBarLayout({
                deck1: [1, 'connect', 'copy', 'pin', 'delete'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });

        it('rejects non-array deck values', () => {
            expect(isValidUtilsBarLayout({ deck1: 'ai', deck2: [] })).toBe(false);
        });

        it('rejects XSS payload as action ID', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect', 'copy', 'pin', '<script>alert(1)</script>'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });

        it('rejects __proto__ as action ID (prototype pollution)', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect', 'copy', 'pin', '__proto__'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });

        it('rejects constructor as action ID (prototype pollution)', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect', 'copy', 'pin', 'constructor'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });

        it('rejects prototype as action ID (prototype pollution)', () => {
            expect(isValidUtilsBarLayout({
                deck1: ['ai', 'connect', 'copy', 'pin', 'prototype'],
                deck2: ['tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            })).toBe(false);
        });
    });

    describe('countActionsPerDeck', () => {
        it('counts default layout correctly', () => {
            const counts = countActionsPerDeck(DEFAULT_UTILS_BAR_LAYOUT);
            expect(counts.deck1).toBe(5);
            expect(counts.deck2).toBe(8);
        });

        it('counts all-deck-1 layout correctly', () => {
            const allDeck1: UtilsBarLayout = { deck1: [...ALL_ACTION_IDS], deck2: [] };
            const counts = countActionsPerDeck(allDeck1);
            expect(counts.deck1).toBe(13);
            expect(counts.deck2).toBe(0);
        });

        it('counts all-deck-2 layout correctly', () => {
            const allDeck2: UtilsBarLayout = { deck1: [], deck2: [...ALL_ACTION_IDS] };
            const counts = countActionsPerDeck(allDeck2);
            expect(counts.deck1).toBe(0);
            expect(counts.deck2).toBe(13);
        });

        it('reflects array lengths', () => {
            const layout: UtilsBarLayout = {
                deck1: ['ai', 'connect', 'copy'],
                deck2: ['pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share', 'pool'],
            };
            const counts = countActionsPerDeck(layout);
            expect(counts.deck1).toBe(3);
            expect(counts.deck2).toBe(10);
        });
    });
});
