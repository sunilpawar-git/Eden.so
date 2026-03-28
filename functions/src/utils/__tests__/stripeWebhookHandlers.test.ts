/**
 * stripeWebhookHandlers Tests
 * Validates each event handler's Firestore write and error path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWriteSubscription = vi.fn();
const mockDowngradeToFree = vi.fn();
const mockLogSecurityEvent = vi.fn();

vi.mock('../subscriptionWriter.js', () => ({
    writeSubscription: mockWriteSubscription,
    downgradeToFree: mockDowngradeToFree,
}));

vi.mock('../securityLogger.js', () => ({
    logSecurityEvent: mockLogSecurityEvent,
    SecurityEventType: {
        SUBSCRIPTION_CHANGE: 'SUBSCRIPTION_CHANGE',
        WEBHOOK_PROCESSING_ERROR: 'WEBHOOK_PROCESSING_ERROR',
    },
}));

import type Stripe from 'stripe';

function makeCheckoutEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
    return {
        id: 'evt_checkout',
        type: 'checkout.session.completed',
        data: {
            object: {
                client_reference_id: 'user-1',
                metadata: { userId: 'user-1' },
                customer: 'cus_abc',
                subscription: 'sub_abc',
                currency: 'usd',
                ...overrides,
            } as Stripe.Checkout.Session,
        },
    } as Stripe.Event;
}

function makeSubscriptionEvent(
    status: Stripe.Subscription.Status,
    overrides: Partial<Stripe.Subscription> = {},
): Stripe.Event {
    return {
        id: 'evt_sub',
        type: 'customer.subscription.updated',
        data: {
            object: {
                id: 'sub_test',
                status,
                metadata: { userId: 'user-42' },
                customer: 'cus_test',
                cancel_at: null,
                cancel_at_period_end: false,
                currency: 'usd',
                items: { data: [] },
                ...overrides,
            } as unknown as Stripe.Subscription,
        },
    } as Stripe.Event;
}

function makeInvoiceEvent(type: string, userId: string): Stripe.Event {
    return {
        id: 'evt_inv',
        type,
        data: {
            object: {
                customer: 'cus_inv',
                currency: 'inr',
                parent: {
                    subscription_details: {
                        subscription: 'sub_inv',
                        metadata: { userId },
                    },
                },
                lines: { data: [{ period: { end: 1800000000 }, pricing: null }] },
            } as unknown as Stripe.Invoice,
        },
    } as Stripe.Event;
}

describe('stripeWebhookHandlers', () => {
    beforeEach(() => {
        vi.resetModules();
        mockWriteSubscription.mockReset().mockResolvedValue(undefined);
        mockDowngradeToFree.mockReset().mockResolvedValue(undefined);
        mockLogSecurityEvent.mockReset();
    });

    describe('handleCheckoutCompleted', () => {
        it('calls writeSubscription with pro tier and isActive=true', async () => {
            const { handleCheckoutCompleted } = await import('../stripeWebhookHandlers.js');
            const event = makeCheckoutEvent();
            const result = await handleCheckoutCompleted(event);
            expect(mockWriteSubscription).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({ tier: 'pro', isActive: true }),
            );
            expect(result.userId).toBe('user-1');
        });

        it('throws when userId is missing', async () => {
            const { handleCheckoutCompleted } = await import('../stripeWebhookHandlers.js');
            const event = makeCheckoutEvent({ client_reference_id: null, metadata: {} });
            await expect(handleCheckoutCompleted(event)).rejects.toThrow('missing userId');
        });

        it('logs a security event on success', async () => {
            const { handleCheckoutCompleted } = await import('../stripeWebhookHandlers.js');
            await handleCheckoutCompleted(makeCheckoutEvent());
            expect(mockLogSecurityEvent).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('activated') }),
            );
        });
    });

    describe('handleSubscriptionUpdated', () => {
        it('sets isActive=true for active status', async () => {
            const { handleSubscriptionUpdated } = await import('../stripeWebhookHandlers.js');
            await handleSubscriptionUpdated(makeSubscriptionEvent('active'));
            expect(mockWriteSubscription).toHaveBeenCalledWith(
                'user-42',
                expect.objectContaining({ tier: 'pro', isActive: true }),
            );
        });

        it('sets isActive=false for past_due status', async () => {
            const { handleSubscriptionUpdated } = await import('../stripeWebhookHandlers.js');
            await handleSubscriptionUpdated(makeSubscriptionEvent('past_due'));
            expect(mockWriteSubscription).toHaveBeenCalledWith(
                'user-42',
                expect.objectContaining({ tier: 'free', isActive: false }),
            );
        });

        it('throws when userId missing from metadata', async () => {
            const { handleSubscriptionUpdated } = await import('../stripeWebhookHandlers.js');
            const event = makeSubscriptionEvent('active', { metadata: {} });
            await expect(handleSubscriptionUpdated(event)).rejects.toThrow('missing userId');
        });
    });

    describe('handleSubscriptionDeleted', () => {
        it('calls downgradeToFree', async () => {
            const { handleSubscriptionDeleted } = await import('../stripeWebhookHandlers.js');
            const event = makeSubscriptionEvent('canceled');
            // Set correct type
            (event as Record<string, unknown>).type = 'customer.subscription.deleted';
            await handleSubscriptionDeleted(event);
            expect(mockDowngradeToFree).toHaveBeenCalledWith('user-42', 'cus_test', 'evt_sub');
        });
    });

    describe('handleInvoicePaid', () => {
        it('calls writeSubscription with pro tier', async () => {
            const { handleInvoicePaid } = await import('../stripeWebhookHandlers.js');
            await handleInvoicePaid(makeInvoiceEvent('invoice.paid', 'user-inv'));
            expect(mockWriteSubscription).toHaveBeenCalledWith(
                'user-inv',
                expect.objectContaining({ tier: 'pro', isActive: true }),
            );
        });

        it('throws when userId missing', async () => {
            const { handleInvoicePaid } = await import('../stripeWebhookHandlers.js');
            await expect(
                handleInvoicePaid(makeInvoiceEvent('invoice.paid', '')),
            ).rejects.toThrow('missing userId');
        });
    });

    describe('handleInvoicePaymentFailed', () => {
        it('calls writeSubscription with isActive=false', async () => {
            const { handleInvoicePaymentFailed } = await import('../stripeWebhookHandlers.js');
            await handleInvoicePaymentFailed(makeInvoiceEvent('invoice.payment_failed', 'user-fail'));
            expect(mockWriteSubscription).toHaveBeenCalledWith(
                'user-fail',
                expect.objectContaining({ isActive: false }),
            );
        });
    });
});
