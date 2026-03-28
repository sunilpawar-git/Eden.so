/**
 * Subscription Writer — Firestore write operations for subscription state
 * This is the ONLY write path for subscription documents.
 * Client reads use subscriptionService.ts (frontend).
 * Firestore rules block all client writes: allow write: if false.
 *
 * Path: users/{userId}/subscription/current
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/** Shape of a subscription update written to Firestore */
export interface SubscriptionUpdate {
    tier: 'free' | 'pro';
    isActive: boolean;
    expiresAt: number | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    currency: string;
    lastEventId: string;
}

/**
 * Write subscription state to Firestore (merge).
 * Adds server timestamp on every write.
 */
export async function writeSubscription(
    userId: string,
    update: SubscriptionUpdate,
): Promise<void> {
    const db = getFirestore();
    const docRef = db.doc(`users/${userId}/subscription/current`);

    await docRef.set(
        { ...update, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
    );
}

/**
 * Downgrade a user to free tier.
 * Called on subscription.deleted and payment_failed events.
 */
export async function downgradeToFree(
    userId: string,
    stripeCustomerId: string,
    lastEventId: string,
): Promise<void> {
    await writeSubscription(userId, {
        tier: 'free',
        isActive: true,
        expiresAt: null,
        stripeCustomerId,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        currency: '',
        lastEventId,
    });
}
