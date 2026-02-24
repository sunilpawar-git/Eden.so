/**
 * Canvas View - ReactFlow wrapper component
 * Store is the single source of truth, ReactFlow syncs to it
 */
import { useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    ConnectionLineType,
    MarkerType,
    SelectionMode,
    PanOnScrollMode,
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
import { useFocusStore } from '../stores/focusStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { IdeaCard } from './nodes/IdeaCard';
import { DeletableEdge } from './edges/DeletableEdge';
import { ZoomControls } from './ZoomControls';
import { FocusOverlay } from './FocusOverlay';
import styles from './CanvasView.module.css';

function getContainerClassName(isSwitching: boolean): string {
    const base = styles.canvasContainer ?? '';
    const switchingClass = styles.switching ?? '';
    return isSwitching ? `${base} ${switchingClass}` : base;
}

// Memoized node types for performance
const nodeTypes = {
    idea: IdeaCard,
};

// Memoized edge types for performance (custom edges with delete button)
const edgeTypes = {
    deletable: DeletableEdge,
};

// eslint-disable-next-line max-lines-per-function -- main ReactFlow integration component
export function CanvasView() {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const setNodes = useCanvasStore((s) => s.setNodes);
    const setEdges = useCanvasStore((s) => s.setEdges);
    const updateNodeDimensions = useCanvasStore((s) => s.updateNodeDimensions);
    const selectNode = useCanvasStore((s) => s.selectNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const isSwitching = useWorkspaceStore((s) => s.isSwitching);
    const canvasGrid = useSettingsStore((s) => s.canvasGrid);
    const canvasScrollMode = useSettingsStore((s) => s.canvasScrollMode);
    const isCanvasLocked = useSettingsStore((s) => s.isCanvasLocked);
    const isFocused = useFocusStore((s) => s.focusedNodeId !== null);
    const isInteractionDisabled = isCanvasLocked || isFocused;
    const isNavigateMode = canvasScrollMode === 'navigate';

    // RAF throttling for resize events (performance optimization)
    const pendingResize = useRef<{ id: string; width: number; height: number } | null>(null);
    const rafId = useRef<number | null>(null);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, []);

    // Convert store nodes to ReactFlow format (width/height from store)
    const rfNodes: Node[] = nodes.map((node) => ({
        id: node.id,
        type: node.type, // 'idea' is the primary type now
        position: node.position,
        data: node.data,
        selected: selectedNodeIds.has(node.id),
        // Pinned nodes cannot be dragged (Phase R: bug fix)
        // Also disabled if canvas is fully locked
        draggable: !isInteractionDisabled && !node.data.isPinned,
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
        type: 'deletable',
        animated: edge.relationshipType === 'derived',
    }));

    // Handle node changes (position, selection, dimensions)
    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            if (isCanvasLocked) return; // Prevent changes when locked

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
                // Use RAF throttling to batch updates during drag
                if (change.type === 'dimensions' && change.dimensions && change.resizing) {
                    pendingResize.current = {
                        id: change.id,
                        width: change.dimensions.width,
                        height: change.dimensions.height,
                    };

                    rafId.current ??= requestAnimationFrame(() => {
                        if (pendingResize.current) {
                            updateNodeDimensions(
                                pendingResize.current.id,
                                pendingResize.current.width,
                                pendingResize.current.height
                            );
                            pendingResize.current = null;
                        }
                        rafId.current = null;
                    });
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
        [nodes, setNodes, updateNodeDimensions, isCanvasLocked]
    );

    // Handle edge changes (removal)
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (isCanvasLocked) return; // Prevent changes when locked

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
        [edges, setEdges, isCanvasLocked]
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            if (isCanvasLocked) return; // Prevent connections when locked

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
        [currentWorkspaceId, isCanvasLocked]
    );

    const onSelectionChange: OnSelectionChangeFunc = useCallback(
        ({ nodes: selectedNodes }) => {
            if (isCanvasLocked) return; // Prevent selection changes when locked

            clearSelection();
            selectedNodes.forEach((node) => selectNode(node.id));
        },
        [clearSelection, selectNode, isCanvasLocked]
    );

    return (
        <div className={getContainerClassName(isSwitching)} data-canvas-container>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineType={ConnectionLineType.Bezier}
                defaultEdgeOptions={{
                    type: 'deletable',
                    markerEnd: { type: MarkerType.ArrowClosed },
                }}
                defaultViewport={{ x: 32, y: 32, zoom: 1 }}
                snapToGrid
                snapGrid={[16, 16]}
                minZoom={0.1}
                maxZoom={2}
                zoomOnScroll={!isInteractionDisabled && !isNavigateMode}
                panOnScroll={!isInteractionDisabled && isNavigateMode}
                panOnDrag={!isInteractionDisabled}
                nodesDraggable={!isInteractionDisabled}
                elementsSelectable={!isInteractionDisabled}
                nodesConnectable={!isInteractionDisabled}
                {...(isNavigateMode && { panOnScrollMode: PanOnScrollMode.Free })}
                selectionOnDrag={!isInteractionDisabled}
                selectionMode={SelectionMode.Partial}
            >
                {canvasGrid && <Background variant={BackgroundVariant.Dots} gap={16} size={1} />}
                <ZoomControls />
            </ReactFlow>
            <FocusOverlay />
        </div>
    );
}
