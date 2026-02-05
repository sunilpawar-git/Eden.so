/**
 * useWorkspaceLoader - Loads workspace data from Firestore on mount
 * Responsibility: Bridge between persistence layer and canvas store
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { loadNodes, loadEdges } from '../services/workspaceService';

interface UseWorkspaceLoaderResult {
    isLoading: boolean;
    error: string | null;
}

export function useWorkspaceLoader(workspaceId: string): UseWorkspaceLoaderResult {
    const { user } = useAuthStore();
    const { setNodes, setEdges } = useCanvasStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Skip loading if no user or workspaceId
        if (!user || !workspaceId) {
            setIsLoading(false);
            return;
        }

        // Capture user.id for the async closure
        const userId = user.id;
        let mounted = true;

        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                const [nodes, edges] = await Promise.all([
                    loadNodes(userId, workspaceId),
                    loadEdges(userId, workspaceId),
                ]);

                if (mounted) {
                    setNodes(nodes);
                    setEdges(edges);
                }
            } catch (err) {
                if (mounted) {
                    const message = err instanceof Error ? err.message : 'Failed to load workspace';
                    setError(message);
                    console.error('[useWorkspaceLoader]', err);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user, workspaceId, setNodes, setEdges]);

    return { isLoading, error };
}
