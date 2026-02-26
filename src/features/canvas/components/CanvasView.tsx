/**
 * Canvas View - ReactFlow wrapper component
 * Store is the single source of truth, ReactFlow syncs to it
 */
import { useCallback, useRef, useEffect, useMemo, memo } from 'react';
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

import { useCanvasStore, EMPTY_SELECTED_IDS } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { IdeaCard } from './nodes/IdeaCard';
import { DeletableEdge } from './edges/DeletableEdge';
import { ZoomControls } from './ZoomControls';
import { FocusOverlay } from './FocusOverlay';
import { buildRfNodes, cleanupDataShells, type PrevRfNodes } from './buildRfNodes';
import { applyPositionAndRemoveChanges } from './canvasChangeHelpers';
import styles from './CanvasView.module.css';

function getContainerClassName(isSwitching: boolean): string {
    const base = styles.canvasContainer ?? '';
    const switchingClass = styles.switching ?? '';
    return isSwitching ? `${base} ${switchingClass}` : base;
}

const nodeTypes = { idea: IdeaCard };
const edgeTypes = { deletable: DeletableEdge };

const DEFAULT_EDGE_OPTIONS = {
    type: 'deletable' as const,
    markerEnd: { type: MarkerType.ArrowClosed },
};
const DEFAULT_VIEWPORT = { x: 32, y: 32, zoom: 1 };
const SNAP_GRID: [number, number] = [16, 16];

// eslint-disable-next-line max-lines-per-function -- main ReactFlow integration component
function CanvasViewInner() {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
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
    const prevRfNodesRef = useRef<PrevRfNodes>({ arr: [], map: new Map() });

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, []);

    const rfNodes: Node[] = useMemo(
        () => buildRfNodes(nodes, selectedNodeIds, isInteractionDisabled, prevRfNodesRef),
        [nodes, selectedNodeIds, isInteractionDisabled],
    );

    useEffect(() => {
        cleanupDataShells(new Set(nodes.map((n) => n.id)));
    }, [nodes]);

    const rfEdges: Edge[] = useMemo(() => edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: `${edge.sourceNodeId}-source`,
        targetHandle: `${edge.targetNodeId}-target`,
        type: 'deletable',
        animated: edge.relationshipType === 'derived',
    })), [edges]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            if (isCanvasLocked) return;

            let hasPositionOrRemove = false;
            for (const change of changes) {
                if ((change.type === 'position' && change.position) || change.type === 'remove') {
                    hasPositionOrRemove = true;
                }
                if (change.type === 'dimensions' && change.dimensions && change.resizing) {
                    pendingResize.current = {
                        id: change.id,
                        width: change.dimensions.width,
                        height: change.dimensions.height,
                    };
                    rafId.current ??= requestAnimationFrame(() => {
                        if (pendingResize.current) {
                            useCanvasStore.getState().updateNodeDimensions(
                                pendingResize.current.id,
                                pendingResize.current.width,
                                pendingResize.current.height
                            );
                            pendingResize.current = null;
                        }
                        rafId.current = null;
                    });
                }
            }

            if (!hasPositionOrRemove) return;

            useCanvasStore.setState((state) => {
                const result = applyPositionAndRemoveChanges(state.nodes, changes);
                return result !== state.nodes ? { nodes: result } : {};
            });
        },
        [isCanvasLocked]
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (isCanvasLocked) return;

            const removals = changes.filter((c) => c.type === 'remove');
            if (removals.length === 0) return;

            useCanvasStore.setState((state) => {
                const removeIds = new Set(removals.map((c) => c.id));
                const filtered = state.edges.filter((e) => !removeIds.has(e.id));
                return filtered.length !== state.edges.length ? { edges: filtered } : {};
            });
        },
        [isCanvasLocked]
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
            if (isCanvasLocked) return;

            const current = useCanvasStore.getState().selectedNodeIds;

            if (selectedNodes.length === 0) {
                if (current.size === 0) return;
                useCanvasStore.setState({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
                return;
            }

            const newIds = new Set(selectedNodes.map((n) => n.id));
            if (newIds.size === current.size &&
                [...newIds].every((id) => current.has(id))) return;
            useCanvasStore.setState({ selectedNodeIds: newIds });
        },
        [isCanvasLocked]
    );

    return (
        <div className={getContainerClassName(isSwitching)} data-canvas-container>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onlyRenderVisibleElements
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineType={ConnectionLineType.Bezier}
                defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                defaultViewport={DEFAULT_VIEWPORT}
                snapToGrid
                snapGrid={SNAP_GRID}
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

export const CanvasView = memo(CanvasViewInner);
