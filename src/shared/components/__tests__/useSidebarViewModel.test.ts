
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarViewModel } from '../useSidebarViewModel';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';

// Mocks
vi.mock('@/shared/stores/settingsStore');
vi.mock('@/features/auth/stores/authStore');
vi.mock('@/features/workspace/stores/workspaceStore');
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher');
vi.mock('@/features/workspace/services/workspaceService');
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

describe('useSidebarViewModel', () => {
    const mockToggleSidebarPin = vi.fn();
    const mockSetCurrentWorkspaceId = vi.fn();
    const mockAddWorkspace = vi.fn();
    const mockSwitchWorkspace = vi.fn();
    const mockUpdateWorkspace = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock returns
        (useSettingsStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                isSidebarPinned: true,
                toggleSidebarPin: mockToggleSidebarPin,
            };
            return selector ? selector(state) : state;
        });

        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { id: 'u1', name: 'User', avatarUrl: '' },
        });

        (useWorkspaceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            currentWorkspaceId: 'ws1',
            workspaces: [{ id: 'ws1', name: 'WS 1' }],
            setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
            addWorkspace: mockAddWorkspace,
            updateWorkspace: mockUpdateWorkspace,
        });

        (useWorkspaceSwitcher as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            switchWorkspace: mockSwitchWorkspace,
        });
    });

    it('should return default pinned state', () => {
        const { result } = renderHook(() => useSidebarViewModel());
        expect(result.current.isPinned).toBe(true);
        expect(result.current.isExpanded).toBe(true); // Pinned = always expanded
    });

    it('should return unpinned state and handle hover', () => {
        (useSettingsStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
            const state = {
                isSidebarPinned: false,
                toggleSidebarPin: mockToggleSidebarPin,
            };
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useSidebarViewModel());

        expect(result.current.isPinned).toBe(false);
        expect(result.current.isExpanded).toBe(false); // Unpinned + no hover = collapsed

        act(() => {
            result.current.onMouseEnter();
        });
        expect(result.current.isExpanded).toBe(true); // Unpinned + hover = expanded

        act(() => {
            result.current.onMouseLeave();
        });
        expect(result.current.isExpanded).toBe(false); // Unpinned + leave = collapsed
    });

    it('should call toggleSidebarPin when toggle is called', () => {
        const { result } = renderHook(() => useSidebarViewModel());

        act(() => {
            result.current.togglePin();
        });

        expect(mockToggleSidebarPin).toHaveBeenCalled();
    });
});
