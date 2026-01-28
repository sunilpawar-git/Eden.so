/**
 * Canvas View - ReactFlow wrapper component
 * Store is the single source of truth, ReactFlow syncs to it
 */
import { useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    ConnectionLineType,
    MarkerType,
    SelectionMode,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type OnSelectionChangeFunc,
    type NodeChange,
    type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../stores/canvasStore';
import { IdeaCard } from './nodes/IdeaCard';
import { AddNodeButton } from './AddNodeButton';
import styles from './CanvasView.module.css';

// Memoized node types for performance
const nodeTypes = {
    idea: IdeaCard,
};

export function CanvasView() {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const setNodes = useCanvasStore((s) => s.setNodes);
    const setEdges = useCanvasStore((s) => s.setEdges);
    const selectNode = useCanvasStore((s) => s.selectNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);

    // Track node internals (measured dimensions, etc.) separately
    const nodeInternalsRef = useRef<Map<string, { width?: number; height?: number }>>(new Map());

    // Convert store nodes to ReactFlow format with preserved internals
    const rfNodes: Node[] = nodes.map((node) => {
        const internals = nodeInternalsRef.current.get(node.id);
        return {
            id: node.id,
            type: node.type, // 'idea' is the primary type now
            position: node.position,
            data: node.data,
            // Preserve measured dimensions if available
            ...(internals?.width && { width: internals.width }),
            ...(internals?.height && { height: internals.height }),
        };
    });

    // Convert store edges to ReactFlow format
    const rfEdges: Edge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: `${edge.sourceNodeId}-source`,
        targetHandle: `${edge.targetNodeId}-target`,
        type: 'bezier',
        animated: edge.relationshipType === 'derived',
    }));

    // Handle node changes (position, selection, dimensions)
    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            let needsUpdate = false;
            const updatedNodes = nodes.map((node) => ({ ...node }));

            for (const change of changes) {
                if (change.type === 'position' && change.position) {
                    const nodeIndex = updatedNodes.findIndex((n) => n.id === change.id);
                    if (nodeIndex !== -1 && updatedNodes[nodeIndex]) {
                        updatedNodes[nodeIndex].position = change.position;
                        needsUpdate = true;
                    }
                }
                // Store measured dimensions in ref (not in store)
                if (change.type === 'dimensions' && change.dimensions) {
                    nodeInternalsRef.current.set(change.id, {
                        width: change.dimensions.width,
                        height: change.dimensions.height,
                    });
                }
                // Handle node removal
                if (change.type === 'remove') {
                    const nodeIndex = updatedNodes.findIndex((n) => n.id === change.id);
                    if (nodeIndex !== -1) {
                        updatedNodes.splice(nodeIndex, 1);
                        nodeInternalsRef.current.delete(change.id);
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                setNodes(updatedNodes);
            }
        },
        [nodes, setNodes]
    );

    // Handle edge changes (removal)
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            let needsUpdate = false;
            const updatedEdges = [...edges];

            for (const change of changes) {
                if (change.type === 'remove') {
                    const edgeIndex = updatedEdges.findIndex((e) => e.id === change.id);
                    if (edgeIndex !== -1) {
                        updatedEdges.splice(edgeIndex, 1);
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                setEdges(updatedEdges);
            }
        },
        [edges, setEdges]
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

    const onSelectionChange: OnSelectionChangeFunc = useCallback(
        ({ nodes: selectedNodes }) => {
            clearSelection();
            selectedNodes.forEach((node) => selectNode(node.id));
        },
        [clearSelection, selectNode]
    );

    return (
        <div className={styles.canvasContainer}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                connectionLineType={ConnectionLineType.Bezier}
                defaultEdgeOptions={{
                    type: 'bezier',
                    markerEnd: { type: MarkerType.ArrowClosed },
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                snapToGrid
                snapGrid={[16, 16]}
                minZoom={0.1}
                maxZoom={2}
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                fitView
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls />
            </ReactFlow>
            <AddNodeButton />
        </div>
    );
}
