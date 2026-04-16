/**
 * usageCountService tests — verifies Firestore reads for AI daily count.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAiDailyCount } from '../usageCountService';

// Mock firebase/firestore
const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'mock-doc-ref'),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));
vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

describe('loadAiDailyCount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns count and date when document exists for today', async () => {
        const today = todayISO();
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ count: 15, date: today }),
        });

        const result = await loadAiDailyCount('user-1');
        expect(result).toEqual({ count: 15, date: today });
    });

    it('returns empty usage when document does not exist', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false });

        const result = await loadAiDailyCount('user-1');
        expect(result).toEqual({ count: 0, date: '' });
    });

    it('returns empty usage when date does not match today', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ count: 50, date: '2020-01-01' }),
        });

        const result = await loadAiDailyCount('user-1');
        expect(result).toEqual({ count: 0, date: '' });
    });

    it('returns empty usage on Firestore error (offline fallback)', async () => {
        mockGetDoc.mockRejectedValue(new Error('offline'));

        const result = await loadAiDailyCount('user-1');
        expect(result).toEqual({ count: 0, date: '' });
    });

    it('handles missing count/date fields gracefully', async () => {
        const today = todayISO();
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ date: today }), // count missing
        });

        const result = await loadAiDailyCount('user-1');
        expect(result).toEqual({ count: 0, date: today });
    });
});
