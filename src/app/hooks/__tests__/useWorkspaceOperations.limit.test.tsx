/**
 * useWorkspaceOperations workspace limit tests.
 * Verifies that free tier users are blocked at 5 workspaces.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useWorkspaceOperations } from '../useWorkspaceOperations';
import { TierLimitsProvider } from '@/features/subscription/contexts/TierLimitsContext';
import { FREE_TIER_LIMITS } from '@/features/subscription/types/tierLimits';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockTier = 'free';
const mockWorkspaces: Array<{ id: string; type?: string }> = [];
const mockCreateNewWorkspace = vi.fn();

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ currentWorkspaceId: 'ws-1', workspaces: mockWorkspaces, isSwitching: false }),
        { getState: () => ({ addWorkspace: vi.fn(), setCurrentWorkspaceId: vi.fn(), setNodeCount: vi.fn(), insertWorkspaceAfter: vi.fn(), workspaces: mockWorkspaces, updateWorkspace: vi.fn(), reorderWorkspaces: vi.fn(), removeWorkspace: vi.fn() }) },
    ),
}));
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ nodes: new Array(mockWorkspaces.length > 0 ? 3 : 0).fill(null) }),
        { getState: () => ({ nodes: [], edges: [], clearCanvas: vi.fn() }) },
    ),
}));
vi.mock('@/features/subscription/stores/subscriptionStore', () => ({
    useSubscriptionStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ tier: mockTier }),
}));
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: () => ({ switchWorkspace: vi.fn() }),
}));
vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: (...args: unknown[]) => mockCreateNewWorkspace(...args),
    createNewDividerWorkspace: vi.fn().mockResolvedValue({ id: 'div-1', type: 'divider', name: '---', canvasSettings: { backgroundColor: 'white' }, createdAt: new Date(), updatedAt: new Date() }),
    saveWorkspace: vi.fn(),
    updateWorkspaceOrder: vi.fn(),
}));
vi.mock('@/features/workspace/stores/offlineQueueStore', () => ({
    useOfflineQueueStore: { getState: () => ({ queueSave: vi.fn() }) },
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/features/subscription/services/usageCountService', () => ({
    loadAiDailyCount: vi.fn().mockResolvedValue({ count: 0, date: '' }),
}));

function wrapper({ children }: { children: ReactNode }) {
    return <TierLimitsProvider>{children}</TierLimitsProvider>;
}

describe('useWorkspaceOperations — workspace limit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTier = 'free';
        mockWorkspaces.length = 0;
        mockCreateNewWorkspace.mockResolvedValue({
            id: 'ws-new', name: 'New', canvasSettings: { backgroundColor: 'grid' },
            createdAt: new Date(), updatedAt: new Date(), nodeCount: 0,
        });
    });

    it('blocks workspace creation when at free limit (5 workspaces)', async () => {
        for (let i = 0; i < FREE_TIER_LIMITS.maxWorkspaces; i++) {
            mockWorkspaces.push({ id: `ws-${i}`, type: 'workspace' });
        }
        const { result } = renderHook(() => useWorkspaceOperations(), { wrapper });

        await act(async () => { await result.current.handleNewWorkspace(); });
        expect(mockCreateNewWorkspace).not.toHaveBeenCalled();
        expect(result.current.upgradeWall).not.toBeNull();
        expect(result.current.upgradeWall?.kind).toBe('workspace');
    });

    it('allows workspace creation under free limit', async () => {
        mockWorkspaces.push({ id: 'ws-1', type: 'workspace' });
        const { result } = renderHook(() => useWorkspaceOperations(), { wrapper });

        await act(async () => { await result.current.handleNewWorkspace(); });
        expect(mockCreateNewWorkspace).toHaveBeenCalledOnce();
        expect(result.current.upgradeWall).toBeNull();
    });

    it('allows pro user at any workspace count', async () => {
        mockTier = 'pro';
        for (let i = 0; i < 10; i++) {
            mockWorkspaces.push({ id: `ws-${i}`, type: 'workspace' });
        }
        const { result } = renderHook(() => useWorkspaceOperations(), { wrapper });

        await act(async () => { await result.current.handleNewWorkspace(); });
        expect(mockCreateNewWorkspace).toHaveBeenCalledOnce();
    });

    it('does not count dividers toward workspace limit', async () => {
        for (let i = 0; i < 4; i++) {
            mockWorkspaces.push({ id: `ws-${i}`, type: 'workspace' });
        }
        mockWorkspaces.push({ id: 'div-1', type: 'divider' });
        mockWorkspaces.push({ id: 'div-2', type: 'divider' });
        const { result } = renderHook(() => useWorkspaceOperations(), { wrapper });

        await act(async () => { await result.current.handleNewWorkspace(); });
        expect(mockCreateNewWorkspace).toHaveBeenCalledOnce();
    });

    it('dismisses upgrade wall', () => {
        const { result } = renderHook(() => useWorkspaceOperations(), { wrapper });
        act(() => { result.current.dismissWall(); });
        expect(result.current.upgradeWall).toBeNull();
    });
});
