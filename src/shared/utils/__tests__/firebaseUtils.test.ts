/**
 * firebaseUtils tests — removeUndefined recursive sanitisation
 */
import { describe, it, expect } from 'vitest';
import { removeUndefined } from '../firebaseUtils';

describe('removeUndefined', () => {
    it('removes top-level undefined values', () => {
        const result = removeUndefined({ a: 1, b: undefined, c: 'hello' });
        expect(result).toEqual({ a: 1, c: 'hello' });
        expect('b' in result).toBe(false);
    });

    it('recursively removes nested undefined values', () => {
        const result = removeUndefined({
            outer: { inner: undefined, keep: 'yes' },
        } as Record<string, unknown>);
        expect(result).toEqual({ outer: { keep: 'yes' } });
    });

    it('preserves arrays as-is (does not recurse into them)', () => {
        const result = removeUndefined({ arr: [1, undefined, 3] });
        expect(result.arr).toEqual([1, undefined, 3]);
    });

    it('preserves Date instances', () => {
        const date = new Date('2024-01-01');
        const result = removeUndefined({ d: date });
        expect(result.d).toBe(date);
    });

    it('preserves null values', () => {
        const result = removeUndefined({ n: null });
        expect(result.n).toBeNull();
    });

    it('preserves primitive values', () => {
        const result = removeUndefined({ num: 42, str: '', bool: false, zero: 0 });
        expect(result).toEqual({ num: 42, str: '', bool: false, zero: 0 });
    });
});
