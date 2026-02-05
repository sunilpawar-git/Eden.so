/**
 * useCompactMode Hook Tests
 * TDD: Tests for compact mode CSS application
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompactMode } from '../useCompactMode';
import { useSettingsStore } from '@/shared/stores/settingsStore';

describe('useCompactMode', () => {
    beforeEach(() => {
        // Reset settings store
        useSettingsStore.setState({ compactMode: false });
        // Clean up any class from document
        document.documentElement.classList.remove('compact-mode');
    });

    afterEach(() => {
        document.documentElement.classList.remove('compact-mode');
    });

    it('should not apply compact-mode class when compactMode is false', () => {
        useSettingsStore.setState({ compactMode: false });
        renderHook(() => useCompactMode());

        expect(document.documentElement.classList.contains('compact-mode')).toBe(false);
    });

    it('should apply compact-mode class when compactMode is true', () => {
        useSettingsStore.setState({ compactMode: true });
        renderHook(() => useCompactMode());

        expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
    });

    it('should update class when compactMode changes', () => {
        renderHook(() => useCompactMode());
        
        expect(document.documentElement.classList.contains('compact-mode')).toBe(false);

        act(() => {
            useSettingsStore.getState().toggleCompactMode();
        });

        expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
    });

    it('should remove class on unmount', () => {
        useSettingsStore.setState({ compactMode: true });
        const { unmount } = renderHook(() => useCompactMode());

        expect(document.documentElement.classList.contains('compact-mode')).toBe(true);

        unmount();

        expect(document.documentElement.classList.contains('compact-mode')).toBe(false);
    });

    it('should return compactMode state', () => {
        useSettingsStore.setState({ compactMode: true });
        const { result } = renderHook(() => useCompactMode());

        expect(result.current).toBe(true);
    });
});
