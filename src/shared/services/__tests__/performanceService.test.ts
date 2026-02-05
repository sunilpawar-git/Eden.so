/**
 * Performance Service Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Metric } from 'web-vitals';

// Mock web-vitals module
vi.mock('web-vitals', () => ({
    onCLS: vi.fn((cb: (m: Metric) => void) => cb(mockMetric('CLS', 0.1))),
    onFCP: vi.fn((cb: (m: Metric) => void) => cb(mockMetric('FCP', 1800))),
    onINP: vi.fn((cb: (m: Metric) => void) => cb(mockMetric('INP', 200))),
    onLCP: vi.fn((cb: (m: Metric) => void) => cb(mockMetric('LCP', 2500))),
    onTTFB: vi.fn((cb: (m: Metric) => void) => cb(mockMetric('TTFB', 100))),
}));

function mockMetric(name: string, value: number): Metric {
    return {
        name: name as Metric['name'],
        value,
        rating: 'good',
        delta: value,
        id: `v3-${Date.now()}-${Math.random()}`,
        navigationType: 'navigate',
        entries: [],
    };
}

describe('performanceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initWebVitals', () => {
        it('initializes all web vitals listeners', async () => {
            const { initWebVitals } = await import('../performanceService');
            const reporter = vi.fn();
            
            await initWebVitals(reporter);
            
            // Should have been called for each metric
            expect(reporter).toHaveBeenCalledTimes(5);
        });

        it('reports CLS metric correctly', async () => {
            const { initWebVitals } = await import('../performanceService');
            const reporter = vi.fn();
            
            await initWebVitals(reporter);
            
            const calls = reporter.mock.calls as Array<[Metric]>;
            const clsCall = calls.find((call) => call[0].name === 'CLS');
            expect(clsCall).toBeDefined();
            expect(clsCall?.[0].value).toBe(0.1);
        });

        it('reports FCP metric correctly', async () => {
            const { initWebVitals } = await import('../performanceService');
            const reporter = vi.fn();
            
            await initWebVitals(reporter);
            
            const calls = reporter.mock.calls as Array<[Metric]>;
            const fcpCall = calls.find((call) => call[0].name === 'FCP');
            expect(fcpCall).toBeDefined();
            expect(fcpCall?.[0].value).toBe(1800);
        });
    });

    describe('createAnalyticsReporter', () => {
        it('creates a reporter function', async () => {
            const { createAnalyticsReporter } = await import('../performanceService');
            const reporter = createAnalyticsReporter('/api/metrics');
            
            expect(typeof reporter).toBe('function');
        });

        it('uses sendBeacon to send metrics', async () => {
            const mockSendBeacon = vi.fn().mockReturnValue(true);
            vi.stubGlobal('navigator', { sendBeacon: mockSendBeacon });

            // Re-import to get fresh module with mocked navigator
            vi.resetModules();
            const { createAnalyticsReporter } = await import('../performanceService');
            const reporter = createAnalyticsReporter('/api/metrics');
            
            reporter(mockMetric('LCP', 2500));
            
            expect(mockSendBeacon).toHaveBeenCalledWith(
                '/api/metrics',
                expect.any(String)
            );
            
            vi.unstubAllGlobals();
        });
    });
});
