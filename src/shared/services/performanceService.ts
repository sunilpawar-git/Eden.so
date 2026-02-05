/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals using the web-vitals library
 */
import type { Metric } from 'web-vitals';
import { strings } from '@/shared/localization/strings';

/** Map metric names to localized labels */
const METRIC_LABELS: Record<string, string> = {
    CLS: strings.performance.cls,
    FCP: strings.performance.fcp,
    FID: strings.performance.fid,
    INP: strings.performance.inp,
    LCP: strings.performance.lcp,
    TTFB: strings.performance.ttfb,
};

/** Callback type for metric reporting */
export type MetricReporter = (metric: Metric) => void;

/**
 * Default reporter that logs metrics to console in development
 */
function createConsoleReporter(): MetricReporter {
    return (metric: Metric) => {
        const label = METRIC_LABELS[metric.name] ?? metric.name;
        const value = metric.name === 'CLS' 
            ? metric.value.toFixed(3) 
            : `${metric.value.toFixed(0)}ms`;
        
        // Only log in development
        if (import.meta.env.DEV) {
            console.log(`[WebVitals] ${label}: ${value}`);
        }
    };
}

/**
 * Initialize web vitals monitoring
 * Dynamically imports web-vitals to avoid blocking initial load
 */
export async function initWebVitals(reporter?: MetricReporter): Promise<void> {
    const report = reporter ?? createConsoleReporter();
    
    try {
        const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
        
        onCLS(report);
        onFCP(report);
        onINP(report);
        onLCP(report);
        onTTFB(report);
    } catch (error) {
        console.warn('[WebVitals] Failed to initialize:', error);
    }
}

/**
 * Create a reporter that sends metrics to an analytics endpoint
 */
export function createAnalyticsReporter(endpoint: string): MetricReporter {
    return (metric: Metric) => {
        const body = JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigationType: metric.navigationType,
        });

        // Use sendBeacon for reliable delivery (non-blocking)
        const sent = navigator.sendBeacon(endpoint, body);
        
        // Fallback to fetch if sendBeacon fails
        if (!sent) {
            fetch(endpoint, { 
                body, 
                method: 'POST', 
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
            }).catch(() => {
                // Silently fail - analytics should not impact UX
            });
        }
    };
}
