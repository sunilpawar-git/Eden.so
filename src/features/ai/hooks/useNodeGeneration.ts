/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContentWithContext, synthesizeNodes } from '../services/geminiService';
import { createAIOutputNode, createDerivedNode, createIdeaNode } from '@/features/canvas/types/node';
import type { IdeaNodeData, NodeData } from '@/features/canvas/types/node';

const AI_NODE_OFFSET_Y = 150;
const BRANCH_OFFSET_X = 350;

/**
 * Hook for generating AI content from a prompt node
 */
export function useNodeGeneration() {
    const { addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();

    /**
     * Generate AI output from a prompt node
     * For IdeaCard nodes: Updates output in-place
     * For legacy PromptNodes: Creates separate output node
     */
    const generateFromPrompt = useCallback(
        async (nodeId: string) => {
            // CRITICAL: Use getState() for fresh data, not closure
            const freshNodes = useCanvasStore.getState().nodes;
            const node = freshNodes.find((n) => n.id === nodeId);
            if (!node) return;

            // Handle IdeaCard nodes (unified prompt + output)
            if (node.type === 'idea') {
                const ideaData = node.data as IdeaNodeData;
                if (!ideaData.prompt) return;

                // Collect upstream context via edges
                const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(nodeId);
                const contextChain: string[] = upstreamNodes
                    .filter((n) => {
                        const data = n.data as IdeaNodeData | NodeData;
                        return 'prompt' in data ? data.prompt : data.content;
                    })
                    .map((n) => {
                        const data = n.data as IdeaNodeData | NodeData;
                        return ('prompt' in data ? data.prompt : data.content) as string;
                    });

                // Set generating state on the node
                useCanvasStore.getState().setNodeGenerating(nodeId, true);
                startGeneration(nodeId);

                try {
                    const content = await generateContentWithContext(ideaData.prompt, contextChain);

                    // Update output in-place (no new node created!)
                    useCanvasStore.getState().updateNodeOutput(nodeId, content);
                    useCanvasStore.getState().setNodeGenerating(nodeId, false);
                    completeGeneration();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Generation failed';
                    useCanvasStore.getState().setNodeGenerating(nodeId, false);
                    setError(message);
                }
                return;
            }

            // Legacy PromptNode handling (creates separate output node)
            const legacyData = node.data as NodeData;
            if (!legacyData.content) return;

            const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(nodeId);
            const contextChain = upstreamNodes
                .filter((n) => n.data.content)
                .map((n) => n.data.content as string);

            startGeneration(nodeId);

            try {
                const content = await generateContentWithContext(
                    legacyData.content as string,
                    contextChain
                );

                const newNode = createAIOutputNode(
                    `ai-${Date.now()}`,
                    node.workspaceId,
                    {
                        x: node.position.x,
                        y: node.position.y + AI_NODE_OFFSET_Y,
                    },
                    content
                );

                addNode(newNode);
                completeGeneration();

                useCanvasStore.getState().addEdge({
                    id: `edge-${Date.now()}`,
                    workspaceId: node.workspaceId,
                    sourceNodeId: nodeId,
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
     * Branch from an IdeaCard to create a new connected IdeaCard
     */
    const branchFromNode = useCallback(
        (sourceNodeId: string) => {
            const freshNodes = useCanvasStore.getState().nodes;
            const sourceNode = freshNodes.find((n) => n.id === sourceNodeId);
            if (!sourceNode) return;

            const newNode = createIdeaNode(
                `idea-${Date.now()}`,
                sourceNode.workspaceId,
                {
                    x: sourceNode.position.x + BRANCH_OFFSET_X,
                    y: sourceNode.position.y,
                },
                '' // Empty prompt for user to fill
            );

            addNode(newNode);

            // Connect source to new node
            useCanvasStore.getState().addEdge({
                id: `edge-${Date.now()}`,
                workspaceId: sourceNode.workspaceId,
                sourceNodeId: sourceNodeId,
                targetNodeId: newNode.id,
                relationshipType: 'related',
            });

            return newNode.id;
        },
        [addNode]
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
        branchFromNode,
    };
}
