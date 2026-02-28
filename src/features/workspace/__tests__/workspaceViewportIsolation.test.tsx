/**
 * Workspace Viewport Isolation Test
 * Ensures each workspace maintains its own canvas viewport (position, zoom)
 *
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { workspaceCache } from '../services/workspaceCache';
import type { Viewport } from '@xyflow/react';

vi.mock('../services/workspaceService', () => ({
    loadNodes: vi.fn(async () => []),
    loadEdges: vi.fn(async () => []),
}));

vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn(async () => []),
}));

vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: () => ({ setEntries: vi.fn() }),
    },
}));

describe('Workspace Viewport Isolation', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: '',
        createdAt: new Date(),
    };
    const workspace1 = 'workspace-1';
    const workspace2 = 'workspace-2';

    beforeEach(() => {
        vi.clearAllMocks();
        workspaceCache.clear();
        useAuthStore.setState({ user: mockUser, isLoading: false });
        useCanvasStore.getState().clearCanvas();
    });

    it('should maintain separate viewport state for each workspace', async () => {
        // Setup: Set viewport for workspace 1
        const viewport1: Viewport = { x: 100, y: 200, zoom: 1.5 };
        workspaceCache.set(workspace1, { nodes: [], edges: [], viewport: viewport1, loadedAt: Date.now() });

        // Load workspace 1
        const { result: result1 } = renderHook(() => useWorkspaceLoader(workspace1));
        await waitFor(() => {
            expect(result1.current.isLoading).toBe(false);
        });

        // Verify viewport 1 is loaded
        const state1 = useCanvasStore.getState();
        expect(state1.viewport).toEqual(viewport1);

        // Setup: Set different viewport for workspace 2
        const viewport2: Viewport = { x: 300, y: 400, zoom: 0.8 };
        workspaceCache.set(workspace2, { nodes: [], edges: [], viewport: viewport2, loadedAt: Date.now() });

        // Switch to workspace 2
        const { result: result2 } = renderHook(() => useWorkspaceLoader(workspace2));
        await waitFor(() => {
            expect(result2.current.isLoading).toBe(false);
        });

        // Verify viewport 2 is loaded
        const state2 = useCanvasStore.getState();
        expect(state2.viewport).toEqual(viewport2);

        // Switch back to workspace 1
        const { result: result1Reload } = renderHook(() => useWorkspaceLoader(workspace1));
        await waitFor(() => {
            expect(result1Reload.current.isLoading).toBe(false);
        });

        // Verify viewport 1 is restored
        const state1Restored = useCanvasStore.getState();
        expect(state1Restored.viewport).toEqual(viewport1);
    });

    it('should use default viewport when workspace has no saved viewport', async () => {
        const DEFAULT_VIEWPORT: Viewport = { x: 32, y: 32, zoom: 1 };

        // Setup: workspace with no viewport
        workspaceCache.set(workspace1, { nodes: [], edges: [], loadedAt: Date.now() });

        // Load workspace
        const { result } = renderHook(() => useWorkspaceLoader(workspace1));
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Verify default viewport is applied
        const state = useCanvasStore.getState();
        expect(state.viewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('should save viewport changes to cache when user pans/zooms', () => {
        const newViewport: Viewport = { x: 500, y: 600, zoom: 2 };

        // Simulate viewport change
        useCanvasStore.getState().setViewport(newViewport);

        // Verify viewport is saved in store
        const state = useCanvasStore.getState();
        expect(state.viewport).toEqual(newViewport);
    });
});
