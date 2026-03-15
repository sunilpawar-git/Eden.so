import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidateBundleCache } from '../bundleLoader';

vi.mock('firebase/firestore', () => ({
    loadBundle: vi.fn(),
    namedQuery: vi.fn(),
    getDocs: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
    httpsCallable: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({
    db: {},
    functions: {},
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('bundleLoader', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('invalidateBundleCache clears sessionStorage', () => {
        sessionStorage.setItem('workspace-bundle', JSON.stringify({ data: 'x', timestamp: Date.now() }));
        invalidateBundleCache();
        expect(sessionStorage.getItem('workspace-bundle')).toBeNull();
    });
});
