/**
 * UtilsBarLayout Tests — SSOT validation, defaults, and security.
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
        it('contains exactly 12 action IDs', () => {
            expect(ALL_ACTION_IDS).toHaveLength(12);
        });

        it('has no duplicates', () => {
            const unique = new Set(ALL_ACTION_IDS);
            expect(unique.size).toBe(ALL_ACTION_IDS.length);
        });
    });

    describe('DEFAULT_UTILS_BAR_LAYOUT', () => {
        it('maps every action ID to a deck', () => {
            for (const id of ALL_ACTION_IDS) {
                expect(DEFAULT_UTILS_BAR_LAYOUT[id]).toBeDefined();
                expect([1, 2]).toContain(DEFAULT_UTILS_BAR_LAYOUT[id]);
            }
        });

        it('assigns quick actions to deck 1', () => {
            expect(DEFAULT_UTILS_BAR_LAYOUT.ai).toBe(1);
            expect(DEFAULT_UTILS_BAR_LAYOUT.connect).toBe(1);
            expect(DEFAULT_UTILS_BAR_LAYOUT.copy).toBe(1);
            expect(DEFAULT_UTILS_BAR_LAYOUT.pin).toBe(1);
            expect(DEFAULT_UTILS_BAR_LAYOUT.delete).toBe(1);
        });

        it('assigns secondary actions to deck 2', () => {
            expect(DEFAULT_UTILS_BAR_LAYOUT.tags).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.image).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.duplicate).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.focus).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.collapse).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.color).toBe(2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.share).toBe(2);
        });

        it('has at least MIN_ACTIONS_PER_DECK in each deck', () => {
            const counts = countActionsPerDeck(DEFAULT_UTILS_BAR_LAYOUT);
            expect(counts.deck1).toBeGreaterThanOrEqual(MIN_ACTIONS_PER_DECK);
            expect(counts.deck2).toBeGreaterThanOrEqual(MIN_ACTIONS_PER_DECK);
        });

        it('passes its own validation', () => {
            expect(isValidUtilsBarLayout(DEFAULT_UTILS_BAR_LAYOUT)).toBe(true);
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

        it('accepts layout with all actions in deck 1 (structurally valid)', () => {
            const allDeck1 = Object.fromEntries(
                ALL_ACTION_IDS.map((id) => [id, 1]),
            ) as UtilsBarLayout;
            expect(isValidUtilsBarLayout(allDeck1)).toBe(true);
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

        it('rejects object with missing keys', () => {
            const { ai: _removed, ...partial } = DEFAULT_UTILS_BAR_LAYOUT;
            expect(isValidUtilsBarLayout(partial)).toBe(false);
        });

        it('rejects object with extra keys', () => {
            const extended = { ...DEFAULT_UTILS_BAR_LAYOUT, hacked: 1 };
            expect(isValidUtilsBarLayout(extended)).toBe(false);
        });

        it('rejects invalid deck value (0)', () => {
            const bad = { ...DEFAULT_UTILS_BAR_LAYOUT, ai: 0 };
            expect(isValidUtilsBarLayout(bad)).toBe(false);
        });

        it('rejects invalid deck value (3)', () => {
            const bad = { ...DEFAULT_UTILS_BAR_LAYOUT, ai: 3 };
            expect(isValidUtilsBarLayout(bad)).toBe(false);
        });

        it('rejects string deck values', () => {
            const bad = { ...DEFAULT_UTILS_BAR_LAYOUT, ai: '1' };
            expect(isValidUtilsBarLayout(bad)).toBe(false);
        });

        it('rejects XSS payload as key', () => {
            const { ai: _removed, ...withoutAi } = DEFAULT_UTILS_BAR_LAYOUT;
            const xss = { ...withoutAi, '<script>alert(1)</script>': 1 };
            expect(isValidUtilsBarLayout(xss)).toBe(false);
        });

        it('rejects __proto__ key (prototype pollution)', () => {
            const poisoned = Object.create(null);
            for (const id of ALL_ACTION_IDS) {
                poisoned[id] = DEFAULT_UTILS_BAR_LAYOUT[id];
            }
            // eslint-disable-next-line @typescript-eslint/dot-notation -- bracket notation required to set own key "__proto__"
            poisoned['__proto__'] = 1;
            expect(isValidUtilsBarLayout(poisoned)).toBe(false);
        });

        it('rejects constructor key (prototype pollution)', () => {
            const { ai: _removed, ...withoutAi } = DEFAULT_UTILS_BAR_LAYOUT;
            const poisoned = { ...withoutAi, constructor: 1 };
            expect(isValidUtilsBarLayout(poisoned)).toBe(false);
        });

        it('rejects prototype key (prototype pollution)', () => {
            const { ai: _removed, ...withoutAi } = DEFAULT_UTILS_BAR_LAYOUT;
            const poisoned = { ...withoutAi, prototype: 1 };
            expect(isValidUtilsBarLayout(poisoned)).toBe(false);
        });
    });

    describe('countActionsPerDeck', () => {
        it('counts default layout correctly', () => {
            const counts = countActionsPerDeck(DEFAULT_UTILS_BAR_LAYOUT);
            expect(counts.deck1).toBe(5);
            expect(counts.deck2).toBe(7);
        });

        it('counts all-deck-1 layout correctly', () => {
            const allDeck1 = Object.fromEntries(
                ALL_ACTION_IDS.map((id) => [id, 1]),
            ) as UtilsBarLayout;
            const counts = countActionsPerDeck(allDeck1);
            expect(counts.deck1).toBe(12);
            expect(counts.deck2).toBe(0);
        });

        it('counts all-deck-2 layout correctly', () => {
            const allDeck2 = Object.fromEntries(
                ALL_ACTION_IDS.map((id) => [id, 2]),
            ) as UtilsBarLayout;
            const counts = countActionsPerDeck(allDeck2);
            expect(counts.deck1).toBe(0);
            expect(counts.deck2).toBe(12);
        });
    });
});
