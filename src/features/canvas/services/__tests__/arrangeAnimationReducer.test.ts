/**
 * Arrange Animation Reducer — Unit tests for all state transitions and delay math.
 * Two-phase state machine: idle → animating → idle (via RESET).
 */
import { describe, it, expect } from 'vitest';
import {
    arrangeAnimationReducer,
    computeTotalAnimationMs,
    INITIAL_ARRANGE_ANIM_STATE,
    STAGGER_DELAY_PER_COLUMN_MS,
    ANIMATION_DURATION_MS,
} from '../arrangeAnimationReducer';

describe('arrangeAnimationReducer', () => {
    describe('START_ANIMATE', () => {
        it('transitions from idle to animating', () => {
            const assignments = new Map([['n1', 0], ['n2', 1]]);
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, {
                type: 'START_ANIMATE',
                columnAssignments: assignments,
            });
            expect(next.phase).toBe('animating');
        });

        it('computes delay of 0ms for column 0 nodes', () => {
            const assignments = new Map([['n1', 0]]);
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, {
                type: 'START_ANIMATE',
                columnAssignments: assignments,
            });
            expect(next.columnDelays.get('n1')).toBe(0);
        });

        it('computes staggered delays per column index', () => {
            const assignments = new Map([
                ['n1', 0], ['n2', 1], ['n3', 2], ['n4', 3],
            ]);
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, {
                type: 'START_ANIMATE',
                columnAssignments: assignments,
            });
            expect(next.columnDelays.get('n1')).toBe(0);
            expect(next.columnDelays.get('n2')).toBe(STAGGER_DELAY_PER_COLUMN_MS);
            expect(next.columnDelays.get('n3')).toBe(STAGGER_DELAY_PER_COLUMN_MS * 2);
            expect(next.columnDelays.get('n4')).toBe(STAGGER_DELAY_PER_COLUMN_MS * 3);
        });

        it('handles empty column assignments', () => {
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, {
                type: 'START_ANIMATE',
                columnAssignments: new Map(),
            });
            expect(next.phase).toBe('animating');
            expect(next.columnDelays.size).toBe(0);
        });

        it('handles multiple nodes in same column', () => {
            const assignments = new Map([['n1', 2], ['n2', 2]]);
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, {
                type: 'START_ANIMATE',
                columnAssignments: assignments,
            });
            expect(next.columnDelays.get('n1')).toBe(STAGGER_DELAY_PER_COLUMN_MS * 2);
            expect(next.columnDelays.get('n2')).toBe(STAGGER_DELAY_PER_COLUMN_MS * 2);
        });
    });

    describe('RESET', () => {
        it('returns initial state from animating', () => {
            const animating = {
                phase: 'animating' as const,
                columnDelays: new Map([['n1', 100]]),
            };
            const next = arrangeAnimationReducer(animating, { type: 'RESET' });
            expect(next).toEqual(INITIAL_ARRANGE_ANIM_STATE);
        });

        it('returns initial state from idle (no-op equivalent)', () => {
            const next = arrangeAnimationReducer(INITIAL_ARRANGE_ANIM_STATE, { type: 'RESET' });
            expect(next).toEqual(INITIAL_ARRANGE_ANIM_STATE);
        });
    });

    describe('unknown action', () => {
        it('returns current state', () => {
            const next = arrangeAnimationReducer(
                INITIAL_ARRANGE_ANIM_STATE,
                { type: 'UNKNOWN' } as never,
            );
            expect(next).toBe(INITIAL_ARRANGE_ANIM_STATE);
        });
    });
});

describe('computeTotalAnimationMs', () => {
    it('returns ANIMATION_DURATION_MS for single column', () => {
        const assignments = new Map([['n1', 0]]);
        expect(computeTotalAnimationMs(assignments)).toBe(ANIMATION_DURATION_MS);
    });

    it('accounts for max column stagger + animation duration', () => {
        const assignments = new Map([
            ['n1', 0], ['n2', 1], ['n3', 3],
        ]);
        const expected = 3 * STAGGER_DELAY_PER_COLUMN_MS + ANIMATION_DURATION_MS;
        expect(computeTotalAnimationMs(assignments)).toBe(expected);
    });

    it('returns ANIMATION_DURATION_MS for empty assignments', () => {
        expect(computeTotalAnimationMs(new Map())).toBe(ANIMATION_DURATION_MS);
    });
});
