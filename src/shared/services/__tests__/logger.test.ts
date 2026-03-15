/**
 * Logger Service — Unit tests
 * Verifies level filtering, Sentry integration, and production suppression.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

describe('logger', () => {
    let logger: typeof import('../logger');
    let captureError: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetModules();
        const sentry = await import('@/shared/services/sentryService');
        captureError = sentry.captureError as ReturnType<typeof vi.fn>;
        captureError.mockClear();
        logger = await import('../logger');
    });

    it('logger.error calls captureError with Error and context', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logger.logger.error('[Test] something broke', new Error('boom'), { extra: 'data' });

        expect(captureError).toHaveBeenCalledTimes(1);
        expect(captureError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ extra: 'data' }));
        spy.mockRestore();
    });

    it('logger.error creates Error from message when no Error provided', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logger.logger.error('[Test] string only');

        expect(captureError).toHaveBeenCalledTimes(1);
        expect(captureError).toHaveBeenCalledWith(
            expect.objectContaining({ message: '[Test] string only' }),
            undefined,
        );
        spy.mockRestore();
    });

    it('logger.warn does NOT call captureError', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        logger.logger.warn('[Test] something is off');

        expect(captureError).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('logger.info does NOT call captureError', () => {
        const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
        logger.logger.info('[Test] informational');

        expect(captureError).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('logger.error forwards message to console.error', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logger.logger.error('[Test] msg', new Error('err'));

        expect(spy).toHaveBeenCalledWith('[Test] msg', expect.any(Error));
        spy.mockRestore();
    });

    it('logger.warn forwards message to console.warn', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        logger.logger.warn('[Test] warning');

        expect(spy).toHaveBeenCalledWith('[Test] warning');
        spy.mockRestore();
    });
});
