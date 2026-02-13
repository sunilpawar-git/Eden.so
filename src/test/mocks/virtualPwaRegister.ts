/**
 * Mock for virtual:pwa-register
 * Provides a testable stub of the vite-plugin-pwa registration API
 */
import type { RegisterSWOptions } from 'virtual:pwa-register';

export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void> {
    if (options?.onOfflineReady) {
        // In test environment, signal offline ready immediately
    }
    return async (_reloadPage?: boolean) => {
        // No-op in test environment
    };
}
