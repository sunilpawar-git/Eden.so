/**
 * Canvas View - ReactFlow wrapper component
 * Store is the single source of truth, ReactFlow syncs to it
 */
import { useCallback } from 'react';
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
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { IdeaCard } from './nodes/IdeaCard';
import { AddNodeButton } from './AddNodeButton';
import { CanvasControls } from './CanvasControls';
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
    const updateNodeDimensions = useCanvasStore((s) => s.updateNodeDimensions);
    const selectNode = useCanvasStore((s) => s.selectNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

    // Convert store nodes to ReactFlow format (width/height from store)
    const rfNodes: Node[] = nodes.map((node) => ({
        id: node.id,
        type: node.type, // 'idea' is the primary type now
        position: node.position,
        data: node.data,
        // Use dimensions from store (persisted from Firestore)
        ...(node.width && { width: node.width }),
        ...(node.height && { height: node.height }),
    }));

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
                // Save dimensions to store for persistence (resizing)
                if (change.type === 'dimensions' && change.dimensions && change.resizing) {
                    updateNodeDimensions(
                        change.id,
                        change.dimensions.width,
                        change.dimensions.height
                    );
                }
                // Handle node removal
                if (change.type === 'remove') {
                    const nodeIndex = updatedNodes.findIndex((n) => n.id === change.id);
                    if (nodeIndex !== -1) {
                        updatedNodes.splice(nodeIndex, 1);
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                setNodes(updatedNodes);
            }
        },
        [nodes, setNodes, updateNodeDimensions]
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
                    workspaceId: currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
                    sourceNodeId: connection.source,
                    targetNodeId: connection.target,
                    relationshipType: 'related' as const,
                };
                useCanvasStore.getState().addEdge(newEdge);
            }
        },
        [currentWorkspaceId]
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
            <CanvasControls />
        </div>
    );
}
