/**
 * webhookIdempotency Tests
 * Validates idempotency check and event recording against Firestore mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({ collection: mockCollection }),
    FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

describe('webhookIdempotency', () => {
    beforeEach(async () => {
        vi.resetModules();
        mockGet.mockReset();
        mockSet.mockReset();
        mockDoc.mockClear();
        mockCollection.mockClear();
    });

    it('checkIdempotency returns true when document exists', async () => {
        mockGet.mockResolvedValue({ exists: true });
        const { checkIdempotency } = await import('../webhookIdempotency.js');
        const result = await checkIdempotency('evt_already_processed');
        expect(result).toBe(true);
    });

    it('checkIdempotency returns false when document does not exist', async () => {
        mockGet.mockResolvedValue({ exists: false });
        const { checkIdempotency } = await import('../webhookIdempotency.js');
        const result = await checkIdempotency('evt_new');
        expect(result).toBe(false);
    });

    it('checkIdempotency queries the correct collection and doc', async () => {
        mockGet.mockResolvedValue({ exists: false });
        const { checkIdempotency } = await import('../webhookIdempotency.js');
        await checkIdempotency('evt_abc123');
        expect(mockCollection).toHaveBeenCalledWith('_webhookEvents');
        expect(mockDoc).toHaveBeenCalledWith('evt_abc123');
    });

    it('recordEvent writes to the correct path with required fields', async () => {
        mockSet.mockResolvedValue(undefined);
        const { recordEvent } = await import('../webhookIdempotency.js');
        await recordEvent('evt_xyz', 'checkout.session.completed', 'user-42');
        expect(mockCollection).toHaveBeenCalledWith('_webhookEvents');
        expect(mockDoc).toHaveBeenCalledWith('evt_xyz');
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({
                eventId: 'evt_xyz',
                eventType: 'checkout.session.completed',
                userId: 'user-42',
                processedAt: 'SERVER_TS',
            }),
        );
    });

    it('recordEvent writes an expiresAt date approximately 30 days ahead', async () => {
        mockSet.mockResolvedValue(undefined);
        const before = Date.now();
        const { recordEvent } = await import('../webhookIdempotency.js');
        await recordEvent('evt_ttl', 'invoice.paid', 'user-1');
        const after = Date.now();

        const call = mockSet.mock.calls[0]?.[0] as Record<string, unknown>;
        const expiresAt = call.expiresAt as Date;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
        expect(expiresAt.getTime()).toBeLessThanOrEqual(after + thirtyDaysMs + 1000);
    });
});
