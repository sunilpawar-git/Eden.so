/**
 * Network Status Store Tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNetworkStatusStore } from '../networkStatusStore';

describe('NetworkStatusStore', () => {
    let addEventSpy: ReturnType<typeof vi.spyOn>;
    let removeEventSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        useNetworkStatusStore.setState({
            isOnline: true,
            lastOnlineAt: null,
            lastOfflineAt: null,
        });
        addEventSpy = vi.spyOn(window, 'addEventListener');
        removeEventSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        addEventSpy.mockRestore();
        removeEventSpy.mockRestore();
    });

    describe('initial state', () => {
        it('should default isOnline to true', () => {
            const { isOnline } = useNetworkStatusStore.getState();
            expect(isOnline).toBe(true);
        });

        it('should have null timestamps initially', () => {
            const { lastOnlineAt, lastOfflineAt } = useNetworkStatusStore.getState();
            expect(lastOnlineAt).toBeNull();
            expect(lastOfflineAt).toBeNull();
        });
    });

    describe('initialize', () => {
        it('should register online and offline event listeners', () => {
            const cleanup = useNetworkStatusStore.getState().initialize();
            expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
            expect(addEventSpy).toHaveBeenCalledWith('offline', expect.any(Function));
            cleanup();
        });

        it('should return a cleanup function that removes listeners', () => {
            const cleanup = useNetworkStatusStore.getState().initialize();
            cleanup();
            expect(removeEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
            expect(removeEventSpy).toHaveBeenCalledWith('offline', expect.any(Function));
        });
    });

    describe('event handling', () => {
        it('should set isOnline to false on offline event', () => {
            const cleanup = useNetworkStatusStore.getState().initialize();
            window.dispatchEvent(new Event('offline'));
            expect(useNetworkStatusStore.getState().isOnline).toBe(false);
            cleanup();
        });

        it('should set isOnline to true on online event', () => {
            useNetworkStatusStore.setState({ isOnline: false });
            const cleanup = useNetworkStatusStore.getState().initialize();
            window.dispatchEvent(new Event('online'));
            expect(useNetworkStatusStore.getState().isOnline).toBe(true);
            cleanup();
        });

        it('should update lastOfflineAt timestamp on offline event', () => {
            const before = Date.now();
            const cleanup = useNetworkStatusStore.getState().initialize();
            window.dispatchEvent(new Event('offline'));
            const { lastOfflineAt } = useNetworkStatusStore.getState();
            expect(lastOfflineAt).toBeGreaterThanOrEqual(before);
            expect(lastOfflineAt).toBeLessThanOrEqual(Date.now());
            cleanup();
        });

        it('should update lastOnlineAt timestamp on online event', () => {
            useNetworkStatusStore.setState({ isOnline: false });
            const before = Date.now();
            const cleanup = useNetworkStatusStore.getState().initialize();
            window.dispatchEvent(new Event('online'));
            const { lastOnlineAt } = useNetworkStatusStore.getState();
            expect(lastOnlineAt).toBeGreaterThanOrEqual(before);
            expect(lastOnlineAt).toBeLessThanOrEqual(Date.now());
            cleanup();
        });
    });
});
