/**
 * Webhook Idempotency Guard — prevents duplicate processing of Stripe events
 * Uses Firestore document existence as the idempotency check.
 * Documents have TTL via expiresAt field — Firestore TTL policy auto-deletes.
 *
 * Collection: _webhookEvents/{stripeEventId}
 * Client access: none (Firestore rules: allow read, write: if false)
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const COLLECTION = '_webhookEvents';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Check if a Stripe event has already been processed.
 * Returns true if the event was already handled (skip processing).
 */
export async function checkIdempotency(eventId: string): Promise<boolean> {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(eventId).get();
    return doc.exists;
}

/**
 * Record a processed event for idempotency.
 * Document has TTL via expiresAt field — Firestore TTL policies auto-delete after 30 days.
 */
export async function recordEvent(
    eventId: string,
    eventType: string,
    userId: string,
): Promise<void> {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(eventId).set({
        eventId,
        eventType,
        userId,
        processedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + TTL_MS),
    });
}
