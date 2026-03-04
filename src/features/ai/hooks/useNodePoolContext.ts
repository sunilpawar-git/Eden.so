/**
 * useNodePoolContext Hook — Builds formatted AI Memory context from pooled nodes
 * Used by AI hooks to inject node pool context into Gemini prompts
 * Follows same pattern as useKnowledgeBankContext for consistency
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { buildNodePoolContext } from '../services/nodePoolBuilder';
import type { NodePoolGenerationType } from '../types/nodePool';

/**
 * Hook that provides a stable getter for the current node pool context string.
 * Accesses stores via getState() to avoid subscriptions and re-renders.
 * Returns a Promise because attachment text may need to be fetched.
 */
export function useNodePoolContext() {
    const getPoolContext = useCallback((
        prompt: string,
        generationType: NodePoolGenerationType,
        excludeNodeIds: ReadonlySet<string>
    ): Promise<string> => {
        const nodes = useCanvasStore.getState().nodes;
        const { workspaces, currentWorkspaceId } = useWorkspaceStore.getState();
        const workspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
        return buildNodePoolContext(nodes, workspace, prompt, generationType, excludeNodeIds);
    }, []);

    return { getPoolContext };
}
