/**
 * Tests for useThemeApplicator hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeApplicator } from '../useThemeApplicator';
import { useSettingsStore } from '@/shared/stores/settingsStore';

// Mock the settings store
vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: vi.fn(),
}));

describe('useThemeApplicator', () => {
    const mockGetResolvedTheme = vi.fn();
    let mockMediaQueryList: { addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

    function setupMock(theme: string, resolvedTheme: string) {
        mockGetResolvedTheme.mockReturnValue(resolvedTheme);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useSettingsStore).mockImplementation((selector: any) => {
            const state = {
                theme,
                getResolvedTheme: mockGetResolvedTheme,
            };
            return selector(state);
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        document.documentElement.dataset.theme = '';

        mockMediaQueryList = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };

        // Mock matchMedia
        vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQueryList as unknown as MediaQueryList);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should apply light theme to document', () => {
        setupMock('light', 'light');
        renderHook(() => useThemeApplicator());
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('should apply dark theme to document', () => {
        setupMock('dark', 'dark');
        renderHook(() => useThemeApplicator());
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should add media query listener when theme is system', () => {
        setupMock('system', 'light');
        renderHook(() => useThemeApplicator());
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove media query listener on cleanup', () => {
        setupMock('system', 'light');
        const { unmount } = renderHook(() => useThemeApplicator());
        unmount();
        expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not add listener when theme is not system', () => {
        setupMock('dark', 'dark');
        renderHook(() => useThemeApplicator());
        expect(mockMediaQueryList.addEventListener).not.toHaveBeenCalled();
    });

    it('should re-apply theme when preferences change', () => {
        setupMock('system', 'light');
        renderHook(() => useThemeApplicator());

        // Get the change handler that was registered
        const calls = mockMediaQueryList.addEventListener.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const changeHandler = calls[0]![1] as () => void;

        // Simulate system preference change
        mockGetResolvedTheme.mockReturnValue('dark');
        changeHandler();

        expect(document.documentElement.dataset.theme).toBe('dark');
    });
});
