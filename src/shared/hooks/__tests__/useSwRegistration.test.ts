/**
 * useSwRegistration Hook Tests
 * TDD: Verifies SW registration lifecycle and update state management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwRegistration } from '../useSwRegistration';

// Mock the virtual:pwa-register module
let mockOnNeedRefresh: (() => void) | undefined;
let mockOnOfflineReady: (() => void) | undefined;
const mockUpdateSw = vi.fn().mockResolvedValue(undefined);

vi.mock('virtual:pwa-register', () => ({
    registerSW: (options?: {
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
    }) => {
        mockOnNeedRefresh = options?.onNeedRefresh;
        mockOnOfflineReady = options?.onOfflineReady;
        return mockUpdateSw;
    },
}));

describe('useSwRegistration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnNeedRefresh = undefined;
        mockOnOfflineReady = undefined;
    });

    it('should initialize with needRefresh=false and offlineReady=false', () => {
        const { result } = renderHook(() => useSwRegistration());
        expect(result.current.needRefresh).toBe(false);
        expect(result.current.offlineReady).toBe(false);
    });

    it('should set needRefresh=true when SW signals update available', async () => {
        const { result } = renderHook(() => useSwRegistration());

        // Wait for the dynamic import to resolve
        await act(async () => {
            await vi.dynamicImportSettled();
        });

        // Simulate SW signaling an update
        act(() => {
            mockOnNeedRefresh?.();
        });

        expect(result.current.needRefresh).toBe(true);
    });

    it('should set offlineReady=true when SW signals offline ready', async () => {
        const { result } = renderHook(() => useSwRegistration());

        await act(async () => {
            await vi.dynamicImportSettled();
        });

        act(() => {
            mockOnOfflineReady?.();
        });

        expect(result.current.offlineReady).toBe(true);
    });

    it('should call updateSw(true) when acceptUpdate is invoked', async () => {
        const { result } = renderHook(() => useSwRegistration());

        await act(async () => {
            await vi.dynamicImportSettled();
        });

        act(() => {
            result.current.acceptUpdate();
        });

        expect(mockUpdateSw).toHaveBeenCalledWith(true);
    });

    it('should set needRefresh=false when dismissUpdate is invoked', async () => {
        const { result } = renderHook(() => useSwRegistration());

        await act(async () => {
            await vi.dynamicImportSettled();
        });

        // Trigger update availability
        act(() => {
            mockOnNeedRefresh?.();
        });
        expect(result.current.needRefresh).toBe(true);

        // Dismiss
        act(() => {
            result.current.dismissUpdate();
        });
        expect(result.current.needRefresh).toBe(false);
    });
});
