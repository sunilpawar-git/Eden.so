/**
 * Stripe Webhook Handlers — processes each Stripe event type
 * Each handler extracts data from the event and writes to Firestore
 * via subscriptionWriter. Returns the resolved userId for idempotency recording.
 *
 * Supported events:
 *  - checkout.session.completed
 *  - customer.subscription.updated
 *  - customer.subscription.deleted
 *  - invoice.paid
 *  - invoice.payment_failed
 *
 * Note: Using Stripe SDK v21 (2026-03-25.dahlia API).
 * - Subscription no longer has current_period_end (use cancel_at or invoice period)
 * - Invoice.subscription moved to Invoice.parent.subscription_details.subscription
 * - InvoiceLineItem.price is string | Stripe.Price
 */
import type Stripe from 'stripe';
import { writeSubscription, downgradeToFree } from './subscriptionWriter.js';
import { logSecurityEvent, SecurityEventType } from './securityLogger.js';

/** Result returned by each handler — userId needed for idempotency record */
export interface HandlerResult {
    userId: string;
}

/** Extract customer ID string from expandable customer field */
function resolveCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string {
    if (!customer) return '';
    if (typeof customer === 'string') return customer;
    return customer.id;
}

/** Extract subscription ID from Invoice parent field (dahlia API) */
function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const details = invoice.parent?.subscription_details;
    if (!details) return null;
    const sub = details.subscription;
    if (!sub) return null;
    return typeof sub === 'string' ? sub : sub.id;
}

/** Extract userId from Invoice parent subscription metadata */
function resolveInvoiceUserId(invoice: Stripe.Invoice): string {
    return invoice.parent?.subscription_details?.metadata?.userId ?? '';
}

/** Extract price ID from a line item (string | Stripe.Price) */
function resolvePriceId(
    price: string | Stripe.Price | null | undefined,
): string | null {
    if (!price) return null;
    return typeof price === 'string' ? price : price.id;
}

/**
 * checkout.session.completed — initial subscription creation
 * userId is in client_reference_id (set by createCheckoutSession)
 */
export async function handleCheckoutCompleted(
    event: Stripe.Event,
): Promise<HandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id
        ?? session.metadata?.userId ?? '';

    if (!userId) {
        throw new Error('checkout.session.completed: missing userId');
    }

    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    const customerId = resolveCustomerId(session.customer);

    await writeSubscription(userId, {
        tier: 'pro',
        isActive: true,
        expiresAt: null,
        gatewayCustomerId: customerId,
        gatewaySubscriptionId: subscriptionId,
        gatewayPlanId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        currency: session.currency ?? 'usd',
        lastEventId: event.id,
        provider: 'stripe',
    });

    logSecurityEvent({
        type: SecurityEventType.SUBSCRIPTION_CHANGE,
        uid: userId,
        endpoint: 'stripeWebhook',
        message: 'Subscription activated via checkout',
        metadata: {
            oldTier: 'free', newTier: 'pro',
            stripeEventId: event.id, customerId,
        },
    });

    return { userId };
}

/**
 * customer.subscription.updated — status/plan changes, cancellation scheduling
 */
export async function handleSubscriptionUpdated(
    event: Stripe.Event,
): Promise<HandlerResult> {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId ?? '';

    if (!userId) {
        throw new Error('subscription.updated: missing userId in metadata');
    }

    const isActive = sub.status === 'active' || sub.status === 'trialing';
    const tier = isActive ? 'pro' : 'free';
    const customerId = resolveCustomerId(sub.customer);
    const firstItem = sub.items?.data[0];
    const priceId = firstItem ? resolvePriceId(firstItem.price) : null;

    // cancel_at is a Unix timestamp or null
    const expiresAt = sub.cancel_at ? sub.cancel_at * 1000 : null;

    await writeSubscription(userId, {
        tier,
        isActive,
        expiresAt,
        gatewayCustomerId: customerId,
        gatewaySubscriptionId: sub.id,
        gatewayPlanId: priceId,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currency: sub.currency ?? 'usd',
        lastEventId: event.id,
        provider: 'stripe',
    });

    logSecurityEvent({
        type: SecurityEventType.SUBSCRIPTION_CHANGE,
        uid: userId,
        endpoint: 'stripeWebhook',
        message: `Subscription updated: status=${sub.status}`,
        metadata: { tier, stripeEventId: event.id, customerId },
    });

    return { userId };
}

/**
 * customer.subscription.deleted — subscription cancelled/expired
 */
export async function handleSubscriptionDeleted(
    event: Stripe.Event,
): Promise<HandlerResult> {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId ?? '';

    if (!userId) {
        throw new Error('subscription.deleted: missing userId in metadata');
    }

    const customerId = resolveCustomerId(sub.customer);
    await downgradeToFree(userId, customerId, event.id);

    logSecurityEvent({
        type: SecurityEventType.SUBSCRIPTION_CHANGE,
        uid: userId,
        endpoint: 'stripeWebhook',
        message: 'Subscription deleted — downgraded to free',
        metadata: {
            oldTier: 'pro', newTier: 'free',
            stripeEventId: event.id, customerId,
        },
    });

    return { userId };
}

/**
 * invoice.paid — recurring payment succeeded, extend subscription
 */
export async function handleInvoicePaid(
    event: Stripe.Event,
): Promise<HandlerResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const userId = resolveInvoiceUserId(invoice);

    if (!userId) {
        throw new Error('invoice.paid: missing userId in metadata');
    }

    const customerId = resolveCustomerId(invoice.customer);
    const subscriptionId = resolveInvoiceSubscriptionId(invoice);
    const firstLine = invoice.lines?.data[0];
    const periodEnd = firstLine?.period?.end;
    const priceId = firstLine?.pricing?.price_details
        ? resolvePriceId(firstLine.pricing.price_details.price) : null;

    await writeSubscription(userId, {
        tier: 'pro',
        isActive: true,
        expiresAt: periodEnd ? periodEnd * 1000 : null,
        gatewayCustomerId: customerId,
        gatewaySubscriptionId: subscriptionId,
        gatewayPlanId: priceId,
        currentPeriodEnd: periodEnd ? periodEnd * 1000 : null,
        cancelAtPeriodEnd: false,
        currency: invoice.currency ?? 'usd',
        lastEventId: event.id,
        provider: 'stripe',
    });

    return { userId };
}

/**
 * invoice.payment_failed — payment failed, mark subscription inactive
 */
export async function handleInvoicePaymentFailed(
    event: Stripe.Event,
): Promise<HandlerResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const userId = resolveInvoiceUserId(invoice);

    if (!userId) {
        throw new Error('invoice.payment_failed: missing userId');
    }

    const customerId = resolveCustomerId(invoice.customer);
    const subscriptionId = resolveInvoiceSubscriptionId(invoice);

    await writeSubscription(userId, {
        tier: 'pro',
        isActive: false,
        expiresAt: null,
        gatewayCustomerId: customerId,
        gatewaySubscriptionId: subscriptionId,
        gatewayPlanId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        currency: invoice.currency ?? 'usd',
        lastEventId: event.id,
        provider: 'stripe',
    });

    logSecurityEvent({
        type: SecurityEventType.PAYMENT_FAILED,
        uid: userId,
        endpoint: 'stripeWebhook',
        message: 'Invoice payment failed',
        metadata: {
            invoiceId: invoice.id,
            stripeEventId: event.id, customerId,
        },
    });

    return { userId };
}
