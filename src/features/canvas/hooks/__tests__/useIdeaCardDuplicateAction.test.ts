/**
 * useIdeaCardDuplicateAction hook tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdeaCardDuplicateAction } from '../useIdeaCardDuplicateAction';
import { useCanvasStore } from '../../stores/canvasStore';
import { toast } from '@/shared/stores/toastStore';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const makeNode = () => ({
    id: 'idea-1',
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: { heading: 'Test', output: 'Output', isGenerating: false, isPromptCollapsed: false },
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useIdeaCardDuplicateAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('returns handleDuplicate callback', () => {
        const { result } = renderHook(() => useIdeaCardDuplicateAction('idea-1'));
        expect(typeof result.current.handleDuplicate).toBe('function');
    });

    it('shows success toast on successful duplicate', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        const { result } = renderHook(() => useIdeaCardDuplicateAction('idea-1'));
        act(() => result.current.handleDuplicate());
        expect(toast.success).toHaveBeenCalledWith('Node duplicated');
    });

    it('shows error toast when node not found', () => {
        const { result } = renderHook(() => useIdeaCardDuplicateAction('nonexistent'));
        act(() => result.current.handleDuplicate());
        expect(toast.error).toHaveBeenCalledWith('Failed to duplicate node');
    });
});
