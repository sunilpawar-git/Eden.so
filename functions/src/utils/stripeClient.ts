/**
 * Stripe Client — singleton Stripe SDK instance with Secret Manager integration
 * Secret is resolved at runtime via defineSecret — never hardcoded.
 * Cached per Cloud Function instance (cold-start only creates a new instance).
 */
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

// Re-derive SecretParam type from defineSecret return to avoid deep import
type SecretParam = ReturnType<typeof defineSecret>;

/** Stripe secret key — stored in Google Cloud Secret Manager */
export const stripeSecretKey: SecretParam = defineSecret('STRIPE_SECRET_KEY');

/** Stripe webhook signing secret — stored in Secret Manager */
export const stripeWebhookSecret: SecretParam = defineSecret('STRIPE_WEBHOOK_SECRET');

let stripeInstance: Stripe | null = null;

/**
 * Returns a Stripe client instance. Cached per Cloud Function instance.
 * Must only be called within a function handler where stripeSecretKey is declared as a secret.
 */
export function getStripeClient(): Stripe {
    if (!stripeInstance) {
        stripeInstance = new Stripe(stripeSecretKey.value(), {
            apiVersion: '2026-03-25.dahlia',
            typescript: true,
        });
    }
    return stripeInstance;
}

/** Reset cached instance (for testing / key rotation scenarios) */
export function resetStripeClient(): void {
    stripeInstance = null;
}
