/**
 * useIdeaCardShareAction hook tests — async share with loading state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdeaCardShareAction } from '../useIdeaCardShareAction';
import { useCanvasStore } from '../../stores/canvasStore';
import { toast } from '@/shared/stores/toastStore';
import type { CanvasNode } from '../../types/node';
import { shareNodeToWorkspace } from '../../services/nodeShareService';
import { useAuthStore } from '@/features/auth/stores/authStore';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/nodeShareService', () => ({
    shareNodeToWorkspace: vi.fn(),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: {
        getState: vi.fn(() => ({ user: { id: 'user-1' } })),
    },
}));

const mockShare = vi.mocked(shareNodeToWorkspace);
const mockGetState = vi.mocked(useAuthStore.getState);

const makeNode = (): CanvasNode => ({
    id: 'idea-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: { heading: 'Test', output: 'Out', isGenerating: false, isPromptCollapsed: false },
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useIdeaCardShareAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockShare.mockResolvedValue('idea-new');
        mockGetState.mockReturnValue({ user: { id: 'user-1' } } as unknown as ReturnType<typeof mockGetState>);
        useCanvasStore.setState({ nodes: [makeNode()], edges: [], selectedNodeIds: new Set() });
    });

    it('returns handleShare callback', () => {
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        expect(typeof result.current.handleShare).toBe('function');
    });

    it('isSharing starts as false', () => {
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        expect(result.current.isSharing).toBe(false);
    });

    it('shows success toast on successful share', async () => {
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(toast.success).toHaveBeenCalledWith('Node shared successfully');
    });

    it('shows error toast on failure', async () => {
        mockShare.mockRejectedValue(new Error('fail'));
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(toast.error).toHaveBeenCalledWith('Failed to share node');
    });

    it('shows error when not authenticated', async () => {
        mockGetState.mockReturnValue({ user: null } as unknown as ReturnType<typeof mockGetState>);
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(toast.error).toHaveBeenCalledWith('Failed to share node');
        expect(mockShare).not.toHaveBeenCalled();
    });

    it('calls shareNodeToWorkspace with correct args', async () => {
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(mockShare).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'idea-1' }), 'ws-target');
    });

    it('isSharing resets to false after success', async () => {
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(result.current.isSharing).toBe(false);
    });

    it('isSharing resets to false after error', async () => {
        mockShare.mockRejectedValue(new Error('fail'));
        const { result } = renderHook(() => useIdeaCardShareAction('idea-1'));
        await act(async () => { await result.current.handleShare('ws-target'); });
        expect(result.current.isSharing).toBe(false);
    });

    it('handleShare has stable identity across renders (ref-based guard)', async () => {
        const { result, rerender } = renderHook(() => useIdeaCardShareAction('idea-1'));
        const first = result.current.handleShare;
        await act(async () => { await result.current.handleShare('ws-target'); });
        rerender();
        expect(result.current.handleShare).toBe(first);
    });
});
