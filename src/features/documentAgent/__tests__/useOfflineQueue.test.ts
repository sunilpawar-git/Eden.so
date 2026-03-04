/**
 * useOfflineQueue Tests — offline queuing for document analysis
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

const { mockToast } = vi.hoisted(() => ({
    mockToast: { info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: mockToast,
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { useOfflineQueue } from '../hooks/useOfflineQueue';
/* eslint-enable import-x/first */

interface QueueItem {
    nodeId: string;
    parsedText: string;
    filename: string;
    workspaceId: string;
}

describe('useOfflineQueue', () => {
    let originalOnLine: boolean;

    beforeEach(() => {
        vi.restoreAllMocks();
        originalOnLine = navigator.onLine;
    });

    afterEach(() => {
        Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });
    });

    it('returns isOnline true when navigator.onLine is true', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        const { result } = renderHook(() => useOfflineQueue());

        expect(result.current.isOnline).toBe(true);
    });

    it('enqueue returns false and shows toast when offline', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        const { result } = renderHook(() => useOfflineQueue());

        const item: QueueItem = {
            nodeId: 'n1',
            parsedText: 'text',
            filename: 'doc.pdf',
            workspaceId: 'ws-1',
        };

        let canProceed = true;
        act(() => { canProceed = result.current.enqueueIfOffline(item); });

        expect(canProceed).toBe(false);
        expect(mockToast.info).toHaveBeenCalledWith(strings.documentAgent.queuedForOnline);
    });

    it('enqueue returns true when online (no queuing needed)', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        const { result } = renderHook(() => useOfflineQueue());

        const canProceed = result.current.enqueueIfOffline({
            nodeId: 'n1',
            parsedText: 'text',
            filename: 'doc.pdf',
            workspaceId: 'ws-1',
        });

        expect(canProceed).toBe(true);
        expect(mockToast.info).not.toHaveBeenCalled();
    });

    it('processes queued items when coming back online', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        const onProcess = vi.fn();

        const { result } = renderHook(() => useOfflineQueue(onProcess));

        act(() => {
            result.current.enqueueIfOffline({
                nodeId: 'n1',
                parsedText: 'queued text',
                filename: 'q.pdf',
                workspaceId: 'ws-1',
            });
        });

        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        expect(onProcess).toHaveBeenCalledWith({
            nodeId: 'n1',
            parsedText: 'queued text',
            filename: 'q.pdf',
            workspaceId: 'ws-1',
        });
    });

    it('clears queue after processing', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        const onProcess = vi.fn();

        const { result } = renderHook(() => useOfflineQueue(onProcess));

        act(() => {
            result.current.enqueueIfOffline({
                nodeId: 'n1',
                parsedText: 'text',
                filename: 'a.pdf',
                workspaceId: 'ws-1',
            });
        });

        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        act(() => { window.dispatchEvent(new Event('online')); });

        expect(result.current.queueSize).toBe(0);
    });

    it('cleans up event listener on unmount', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useOfflineQueue());

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
        removeSpy.mockRestore();
    });

    it('updates isOnline when online event fires', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        const { result } = renderHook(() => useOfflineQueue());

        expect(result.current.isOnline).toBe(false);

        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        act(() => { window.dispatchEvent(new Event('online')); });

        expect(result.current.isOnline).toBe(true);
    });
});
