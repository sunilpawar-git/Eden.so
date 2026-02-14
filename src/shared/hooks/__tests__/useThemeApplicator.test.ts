/**
 * useThemeApplicator Hook Tests
 * TDD: Validates theme is applied to document root for all theme options
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeApplicator } from '../useThemeApplicator';
import { useSettingsStore } from '@/shared/stores/settingsStore';

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

describe('useThemeApplicator', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', mockMatchMedia);
        document.documentElement.dataset.theme = '';
        useSettingsStore.setState({ theme: 'system' });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete document.documentElement.dataset.theme;
    });

    it('should apply light theme to document', () => {
        useSettingsStore.setState({ theme: 'light' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('should apply dark theme to document', () => {
        useSettingsStore.setState({ theme: 'dark' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should apply sepia theme to document', () => {
        useSettingsStore.setState({ theme: 'sepia' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('sepia');
    });

    it('should apply grey theme to document', () => {
        useSettingsStore.setState({ theme: 'grey' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('grey');
    });

    it('should apply darkBlack theme to document', () => {
        useSettingsStore.setState({ theme: 'darkBlack' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('darkBlack');
    });

    it('should resolve system theme based on OS preference', () => {
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        useSettingsStore.setState({ theme: 'system' });
        renderHook(() => useThemeApplicator());

        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should listen for system preference changes when theme is system', () => {
        const mockAddListener = vi.fn();
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: mockAddListener,
            removeEventListener: vi.fn(),
        }));

        useSettingsStore.setState({ theme: 'system' });
        renderHook(() => useThemeApplicator());

        expect(mockAddListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not listen for system changes when theme is light', () => {
        const mockAddListener = vi.fn();
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: mockAddListener,
            removeEventListener: vi.fn(),
        }));

        useSettingsStore.setState({ theme: 'light' });
        renderHook(() => useThemeApplicator());
        expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('should not listen for system changes when theme is sepia', () => {
        const mockAddListener = vi.fn();
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: mockAddListener,
            removeEventListener: vi.fn(),
        }));

        useSettingsStore.setState({ theme: 'sepia' });
        renderHook(() => useThemeApplicator());
        expect(mockAddListener).not.toHaveBeenCalled();
    });
});
