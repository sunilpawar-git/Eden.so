/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContentWithContext, synthesizeNodes } from '../services/geminiService';
import { createAIOutputNode, createDerivedNode } from '@/features/canvas/types/node';

const AI_NODE_OFFSET_Y = 150;

/**
 * Hook for generating AI content from a prompt node
 */
export function useNodeGeneration() {
    const { addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();

    /**
     * Generate AI output from a prompt node
     * Uses edge-aware context: collects all upstream connected nodes
     */
    const generateFromPrompt = useCallback(
        async (promptNodeId: string) => {
            // CRITICAL: Use getState() for fresh data, not closure
            const freshNodes = useCanvasStore.getState().nodes;
            const promptNode = freshNodes.find((n) => n.id === promptNodeId);
            if (!promptNode || !promptNode.data.content) return;

            // Collect upstream context via edges (Obsidian-style)
            const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(promptNodeId);
            const contextChain = upstreamNodes
                .filter((n) => n.data.content)
                .map((n) => n.data.content as string);

            startGeneration(promptNodeId);

            try {
                // Use context-aware generation with upstream edges
                const content = await generateContentWithContext(
                    promptNode.data.content as string,
                    contextChain
                );

                // Position AI output below the prompt
                const newNode = createAIOutputNode(
                    `ai-${Date.now()}`,
                    promptNode.workspaceId,
                    {
                        x: promptNode.position.x,
                        y: promptNode.position.y + AI_NODE_OFFSET_Y,
                    },
                    content
                );

                addNode(newNode);
                completeGeneration();

                // Auto-connect prompt to output
                useCanvasStore.getState().addEdge({
                    id: `edge-${Date.now()}`,
                    workspaceId: promptNode.workspaceId,
                    sourceNodeId: promptNodeId,
                    targetNodeId: newNode.id,
                    relationshipType: 'derived',
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Generation failed';
                setError(message);
            }
        },
        [addNode, startGeneration, completeGeneration, setError]
    );

    /**
     * Synthesize content from connected nodes
     */
    const synthesizeConnectedNodes = useCallback(
        async (nodeIds: string[]) => {
            if (nodeIds.length < 2) return;

            // CRITICAL: Use getState() for fresh data, not closure
            const freshNodes = useCanvasStore.getState().nodes;
            const selectedNodes = freshNodes.filter((n) => nodeIds.includes(n.id));
            if (selectedNodes.length < 2) return;

            startGeneration(nodeIds[0] ?? '');

            try {
                const contents = selectedNodes.map((n) => n.data.content as string);
                const synthesizedContent = await synthesizeNodes(contents);

                // Calculate center position between nodes
                const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
                const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;

                const newNode = createDerivedNode(
                    `derived-${Date.now()}`,
                    selectedNodes[0]?.workspaceId ?? '',
                    { x: avgX, y: avgY + AI_NODE_OFFSET_Y },
                    synthesizedContent
                );

                addNode(newNode);
                completeGeneration();

                // Connect all source nodes to derived node
                selectedNodes.forEach((sourceNode) => {
                    useCanvasStore.getState().addEdge({
                        id: `edge-${Date.now()}-${sourceNode.id}`,
                        workspaceId: sourceNode.workspaceId,
                        sourceNodeId: sourceNode.id,
                        targetNodeId: newNode.id,
                        relationshipType: 'derived',
                    });
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Synthesis failed';
                setError(message);
            }
        },
        [addNode, startGeneration, completeGeneration, setError]
    );

    /**
     * Traverse upstream chain and synthesize into target node
     * Collects all ancestor content recursively
     */
    const synthesizeUpstreamChain = useCallback(
        async (targetNodeId: string) => {
            const { nodes: freshNodes, edges: freshEdges } = useCanvasStore.getState();
            const targetNode = freshNodes.find((n) => n.id === targetNodeId);
            if (!targetNode) return;

            // Collect all upstream nodes via BFS
            const visited = new Set<string>();
            const queue: string[] = [targetNodeId];
            const upstreamContents: string[] = [];

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (visited.has(currentId)) continue;
                visited.add(currentId);

                // Find all incoming edges to current node
                const incomingEdges = freshEdges.filter((e) => e.targetNodeId === currentId);
                for (const edge of incomingEdges) {
                    const sourceNode = freshNodes.find((n) => n.id === edge.sourceNodeId);
                    if (sourceNode && sourceNode.data.content) {
                        upstreamContents.push(sourceNode.data.content as string);
                        queue.push(sourceNode.id);
                    }
                }
            }

            if (upstreamContents.length === 0) return;

            startGeneration(targetNodeId);

            try {
                const synthesizedContent = await synthesizeNodes(upstreamContents);

                // Update target node content with synthesized result
                useCanvasStore.getState().updateNodeContent(targetNodeId, synthesizedContent);
                completeGeneration();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Synthesis failed';
                setError(message);
            }
        },
        [startGeneration, completeGeneration, setError]
    );

    return {
        generateFromPrompt,
        synthesizeConnectedNodes,
        synthesizeUpstreamChain,
    };
}
