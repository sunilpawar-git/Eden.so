/**
 * UtilsBarLayoutSlice Tests — Direct unit tests for pure layout functions.
 * computeNextLayout: deck-switch logic (arrow buttons).
 * computeReorder: within-deck and cross-deck drag reordering.
 */
import { describe, it, expect } from 'vitest';
import { computeNextLayout, computeReorder } from '../utilsBarLayoutSlice';
import { DEFAULT_UTILS_BAR_LAYOUT, MIN_ACTIONS_PER_DECK } from '@/features/canvas/types/utilsBarLayout';
import type { UtilsBarLayout } from '@/features/canvas/types/utilsBarLayout';

/** Layout with exactly MIN_ACTIONS_PER_DECK in deck1 */
const MINIMUM_DECK1: UtilsBarLayout = {
    deck1: ['ai', 'connect'],
    deck2: ['copy', 'pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
};

describe('computeNextLayout', () => {
    it('returns null when action is already in the target deck', () => {
        const result = computeNextLayout(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 1);
        expect(result).toBeNull();
    });

    it('returns null when source deck would drop below MIN_ACTIONS_PER_DECK', () => {
        // deck1 has exactly MIN_ACTIONS_PER_DECK — cannot move out
        const result = computeNextLayout(MINIMUM_DECK1, 'ai', 2);
        expect(result).toBeNull();
    });

    it('moves action from deck1 to deck2, appended at the end', () => {
        const result = computeNextLayout(DEFAULT_UTILS_BAR_LAYOUT, 'connect', 2);
        expect(result).not.toBeNull();
        expect(result!.deck1).not.toContain('connect');
        expect(result!.deck2[result!.deck2.length - 1]).toBe('connect');
    });

    it('moves action from deck2 to deck1, appended at the end', () => {
        const result = computeNextLayout(DEFAULT_UTILS_BAR_LAYOUT, 'tags', 1);
        expect(result).not.toBeNull();
        expect(result!.deck2).not.toContain('tags');
        expect(result!.deck1[result!.deck1.length - 1]).toBe('tags');
    });

    it('preserves all other actions in both decks', () => {
        const result = computeNextLayout(DEFAULT_UTILS_BAR_LAYOUT, 'connect', 2)!;
        const totalBefore = DEFAULT_UTILS_BAR_LAYOUT.deck1.length + DEFAULT_UTILS_BAR_LAYOUT.deck2.length;
        const totalAfter = result.deck1.length + result.deck2.length;
        expect(totalAfter).toBe(totalBefore);
    });

    it('does not mutate the original layout', () => {
        const original = {
            deck1: [...DEFAULT_UTILS_BAR_LAYOUT.deck1],
            deck2: [...DEFAULT_UTILS_BAR_LAYOUT.deck2],
        };
        computeNextLayout(DEFAULT_UTILS_BAR_LAYOUT, 'connect', 2);
        expect(DEFAULT_UTILS_BAR_LAYOUT.deck1).toEqual(original.deck1);
        expect(DEFAULT_UTILS_BAR_LAYOUT.deck2).toEqual(original.deck2);
    });

    it('source deck has one more than MIN_ACTIONS_PER_DECK — move is allowed', () => {
        const layout: UtilsBarLayout = {
            deck1: ['ai', 'connect', 'copy'], // 3 = MIN + 1
            deck2: ['pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
        };
        const result = computeNextLayout(layout, 'copy', 2);
        expect(result).not.toBeNull();
    });
});

describe('computeReorder', () => {
    describe('within-deck reordering', () => {
        it('moves item from index 0 to index 2 within deck1', () => {
            // Default deck1: ['ai', 'connect', 'copy', 'pin', 'delete']
            // Moving 'ai' to index 2 → ['connect', 'copy', 'ai', 'pin', 'delete']
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 1, 2);
            expect(result).not.toBeNull();
            expect(result!.deck1[2]).toBe('ai');
            expect(result!.deck1[0]).toBe('connect');
            expect(result!.deck1[1]).toBe('copy');
        });

        it('returns null when fromIndex equals targetIndex (no-op)', () => {
            // 'ai' is at index 0, target is index 0
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 1, 0);
            expect(result).toBeNull();
        });

        it('moves last item to first position within deck1', () => {
            // Default deck1: ['ai', 'connect', 'copy', 'pin', 'delete']
            // Moving 'delete' (index 4) to index 0 → ['delete', 'ai', 'connect', 'copy', 'pin']
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'delete', 1, 0);
            expect(result).not.toBeNull();
            expect(result!.deck1[0]).toBe('delete');
            expect(result!.deck1[1]).toBe('ai');
        });

        it('does not change the opposite deck for within-deck reorder', () => {
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 1, 2)!;
            expect(result.deck2).toEqual(DEFAULT_UTILS_BAR_LAYOUT.deck2);
        });

        it('does not mutate original layout for within-deck reorder', () => {
            const deck1Before = [...DEFAULT_UTILS_BAR_LAYOUT.deck1];
            computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 1, 2);
            expect(DEFAULT_UTILS_BAR_LAYOUT.deck1).toEqual(deck1Before);
        });
    });

    describe('cross-deck reordering', () => {
        it('moves item from deck1 to deck2 at the specified target index', () => {
            // Default deck1: ['ai', 'connect', 'copy', 'pin', 'delete'] (5 items > MIN=2)
            // Moving 'ai' to deck2 at index 0
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 2, 0);
            expect(result).not.toBeNull();
            expect(result!.deck1).not.toContain('ai');
            expect(result!.deck2[0]).toBe('ai');
        });

        it('returns null when source deck is at MIN_ACTIONS_PER_DECK', () => {
            // MINIMUM_DECK1 has deck1 with exactly MIN_ACTIONS_PER_DECK — cannot remove
            const result = computeReorder(MINIMUM_DECK1, 'ai', 2, 0);
            expect(result).toBeNull();
        });

        it('clamps out-of-bounds targetIndex to newTarget.length (appends at end)', () => {
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 2, 999);
            expect(result).not.toBeNull();
            // ai should be at the last position of deck2
            const deck2 = result!.deck2;
            expect(deck2[deck2.length - 1]).toBe('ai');
        });

        it('clamps negative targetIndex to 0 (inserts at start)', () => {
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 2, -1);
            expect(result).not.toBeNull();
            expect(result!.deck2[0]).toBe('ai');
        });

        it('preserves total action count for cross-deck moves', () => {
            const result = computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 2, 0)!;
            const totalBefore = DEFAULT_UTILS_BAR_LAYOUT.deck1.length + DEFAULT_UTILS_BAR_LAYOUT.deck2.length;
            const totalAfter = result.deck1.length + result.deck2.length;
            expect(totalAfter).toBe(totalBefore);
        });

        it('does not mutate original layout for cross-deck reorder', () => {
            const deck1Before = [...DEFAULT_UTILS_BAR_LAYOUT.deck1];
            const deck2Before = [...DEFAULT_UTILS_BAR_LAYOUT.deck2];
            computeReorder(DEFAULT_UTILS_BAR_LAYOUT, 'ai', 2, 0);
            expect(DEFAULT_UTILS_BAR_LAYOUT.deck1).toEqual(deck1Before);
            expect(DEFAULT_UTILS_BAR_LAYOUT.deck2).toEqual(deck2Before);
        });

        it('source deck has MIN_ACTIONS_PER_DECK + 1 — cross-deck move is allowed', () => {
            const layout: UtilsBarLayout = {
                deck1: ['ai', 'connect', 'copy'], // 3 = MIN + 1
                deck2: ['pin', 'delete', 'tags', 'image', 'duplicate', 'focus', 'collapse', 'color', 'share'],
            };
            const result = computeReorder(layout, 'copy', 2, 0);
            expect(result).not.toBeNull();
        });
    });

    it('MIN_ACTIONS_PER_DECK constant is at least 2 (precondition)', () => {
        expect(MIN_ACTIONS_PER_DECK).toBeGreaterThanOrEqual(2);
    });
});
