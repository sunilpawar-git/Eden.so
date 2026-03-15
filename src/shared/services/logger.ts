/**
 * Structured Logger — Centralized logging with Sentry integration.
 * All production code should use this instead of raw console.* calls.
 *
 * - error: logs + reports to Sentry via captureError
 * - warn:  logs only (no Sentry — warnings are non-critical)
 * - info:  logs only in non-production environments
 */
import { captureError } from '@/shared/services/sentryService';

export const logger = {
    error(message: string, error?: unknown, context?: Record<string, unknown>): void {
        console.error(message, ...(error !== undefined ? [error] : []));
        const err = error instanceof Error ? error : new Error(message);
        captureError(err, context);
    },

    warn(message: string, ...args: unknown[]): void {
        console.warn(message, ...args);
    },

    info(message: string, ...args: unknown[]): void {
        if (import.meta.env.PROD) return;
        console.info(message, ...args);
    },
} as const;
