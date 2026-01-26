/**
 * Canvas View - ReactFlow wrapper component
 * Performance: onlyRenderVisibleElements enabled
 */
import { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../stores/canvasStore';
import { PromptNode } from './nodes/PromptNode';
import { AIOutputNode } from './nodes/AIOutputNode';
import { AddNodeButton } from './AddNodeButton';
import { SynthesisButton } from '@/features/ai/components/SynthesisButton';
import styles from './CanvasView.module.css';

// Memoized node types for performance
const nodeTypes = {
    prompt: PromptNode,
    ai_output: AIOutputNode,
    derived: AIOutputNode, // Reuse for now, can customize later
};

export function CanvasView() {
    const { nodes, edges, setNodes, setEdges } = useCanvasStore();

    // Convert our nodes to ReactFlow format
    const rfNodes: Node[] = useMemo(
        () =>
            nodes.map((node) => ({
                id: node.id,
                type: node.type === 'prompt' ? 'prompt' : 'ai_output',
                position: node.position,
                data: node.data,
                // Explicit dimensions prevent ReactFlow from setting visibility:hidden
                width: 280,
                height: 100,
            })),
        [nodes]
    );

    // Convert our edges to ReactFlow format
    const rfEdges: Edge[] = useMemo(
        () =>
            edges.map((edge) => ({
                id: edge.id,
                source: edge.sourceNodeId,
                target: edge.targetNodeId,
                type: 'smoothstep',
                animated: edge.relationshipType === 'derived',
            })),
        [edges]
    );

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            const updatedRfNodes = applyNodeChanges(changes, rfNodes);
            // Sync back to our store
            const updatedNodes = nodes.map((node) => {
                const rfNode = updatedRfNodes.find((n) => n.id === node.id);
                if (rfNode) {
                    return { ...node, position: rfNode.position };
                }
                return node;
            });
            setNodes(updatedNodes);
        },
        [rfNodes, nodes, setNodes]
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            const updatedRfEdges = applyEdgeChanges(changes, rfEdges);
            // Sync deletions back to our store
            const updatedEdges = edges.filter((edge) =>
                updatedRfEdges.some((rfEdge) => rfEdge.id === edge.id)
            );
            setEdges(updatedEdges);
        },
        [rfEdges, edges, setEdges]
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            if (connection.source && connection.target) {
                const newEdge = {
                    id: `edge-${Date.now()}`,
                    workspaceId: nodes[0]?.workspaceId ?? '',
                    sourceNodeId: connection.source,
                    targetNodeId: connection.target,
                    relationshipType: 'related' as const,
                };
                useCanvasStore.getState().addEdge(newEdge);
            }
        },
        [nodes]
    );

    return (
        <div className={styles.canvasContainer}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                snapToGrid
                snapGrid={[16, 16]}
                minZoom={0.1}
                maxZoom={2}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls />
            </ReactFlow>
            <AddNodeButton />
            <SynthesisButton />
        </div>
    );
}
