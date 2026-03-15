/**
 * firebaseUtils tests — removeUndefined + chunkedBatchWrite
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeUndefined } from '../firebaseUtils';

const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>;
    return {
        ...actual,
        writeBatch: vi.fn(() => ({
            set: mockBatchSet,
            delete: mockBatchDelete,
            commit: mockBatchCommit,
        })),
        getDocs: vi.fn(),
        query: vi.fn((ref: unknown) => ref),
        limit: vi.fn(),
    };
});

vi.mock('@/config/firebase', () => ({ db: {} }));

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

describe('chunkedBatchWrite', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('commits all ops in a single batch when under 500', async () => {
        const { chunkedBatchWrite } = await import('../firebaseUtils');
        const ops = Array.from({ length: 3 }, (_, i) => ({
            type: 'set' as const,
            ref: { id: `doc-${i}` } as never,
            data: { value: i },
        }));
        await chunkedBatchWrite(ops);
        expect(mockBatchSet).toHaveBeenCalledTimes(3);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('chunks into multiple batches when over 500 ops', async () => {
        const { chunkedBatchWrite } = await import('../firebaseUtils');
        const ops = Array.from({ length: 600 }, (_, i) => ({
            type: 'set' as const,
            ref: { id: `doc-${i}` } as never,
            data: { value: i },
        }));
        await chunkedBatchWrite(ops);
        expect(mockBatchCommit).toHaveBeenCalledTimes(2);
        expect(mockBatchSet).toHaveBeenCalledTimes(600);
    });

    it('handles delete operations', async () => {
        const { chunkedBatchWrite } = await import('../firebaseUtils');
        const ops = [{ type: 'delete' as const, ref: { id: 'del-1' } as never }];
        await chunkedBatchWrite(ops);
        expect(mockBatchDelete).toHaveBeenCalledTimes(1);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('handles empty ops array', async () => {
        const { chunkedBatchWrite } = await import('../firebaseUtils');
        await chunkedBatchWrite([]);
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });
});
