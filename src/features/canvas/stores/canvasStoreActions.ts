/**
 * canvasStoreActions — Action factory functions for the canvas Zustand store.
 * Each factory receives (set, get) and returns a group of related actions.
 * Keeps canvasStore.ts under the 300-line limit by separating action logic.
 */
import type { Viewport } from '@xyflow/react';
import type { CanvasNode, IdeaNodeData, LinkPreviewMetadata, NodeColorKey } from '../types/node';
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import type { InputMode } from '../types/slashCommand';
import type { CanvasEdge } from '../types/edge';
import {
    updateNodeDimensionsInArray,
    updateNodeDataField,
    appendToNodeOutputInArray,
    togglePromptCollapsedInArray,
    deleteNodeFromArrays,
    getConnectedNodeIds,
    getUpstreamNodesFromArrays,
    arrangeNodesInGrid,
    arrangeNodesAfterResize,
    toggleNodePinnedInArray,
    toggleNodeCollapsedInArray,
    toggleNodePoolInArray,
    clearAllNodePoolInArray,
    setNodeColorInArray,
    insertNodeAtIndexInArray,
    deleteNodesFromArrays,
} from './canvasStoreHelpers';
import { duplicateNode as cloneNode } from '../services/nodeDuplicationService';
import { EMPTY_SELECTED_IDS, getNodeMap, DEFAULT_VIEWPORT, DEFAULT_INPUT_MODE } from './canvasStoreUtils';
import type { CanvasStore } from './canvasStore';
import type { ClusterGroup } from '@/features/clustering/types/cluster';

type SetFn = (partial: Partial<CanvasStore> | ((s: CanvasStore) => Partial<CanvasStore>)) => void;
type GetFn = () => CanvasStore;

/** Pure helper: prune cluster groups in same set() as node deletion (prevents nested set() cascade) */
function pruneClusterGroups(
    groups: readonly ClusterGroup[],
    existingNodeIds: ReadonlySet<string>,
): { clusterGroups: ClusterGroup[] } {
    return {
        clusterGroups: groups
            .map((g) => ({ ...g, nodeIds: g.nodeIds.filter((id) => existingNodeIds.has(id)) }))
            .filter((g) => g.nodeIds.length >= 2),
    };
}

// ---------------------------------------------------------------------------
// Node mutation actions (structural: add, duplicate, delete, bulk)
// ---------------------------------------------------------------------------

export function createNodeMutationActions(set: SetFn, get: GetFn) {
    return {
        addNode: (node: CanvasNode) => set((s) => ({ nodes: [...s.nodes, node] })),

        addNodeAndEdge: (node: CanvasNode, edge: CanvasEdge) =>
            set((s) => ({ nodes: [...s.nodes, node], edges: [...s.edges, edge] })),

        duplicateNode: (nodeId: string): string | undefined => {
            const nodes = get().nodes;
            const node = getNodeMap(nodes).get(nodeId);
            if (!node) return undefined;
            const newNode = cloneNode(node, nodes);
            set((s) => ({ nodes: [...s.nodes, newNode] }));
            return newNode.id;
        },

        updateNodeDimensions: (nodeId: string, width: number, height: number) =>
            set((s) => ({ nodes: updateNodeDimensionsInArray(s.nodes, nodeId, width, height) })),

        updateNodeContent: (nodeId: string, content: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'content', content) })),

        deleteNode: (nodeId: string) => {
            set((s) => {
                const deletion = deleteNodeFromArrays(s.nodes, s.edges, s.selectedNodeIds, nodeId);
                const editingClear = s.editingNodeId === nodeId
                    ? { editingNodeId: null, draftContent: null, inputMode: DEFAULT_INPUT_MODE }
                    : {};
                const clusterPrune = s.clusterGroups.length > 0
                    ? pruneClusterGroups(s.clusterGroups, new Set(deletion.nodes.map((n) => n.id)))
                    : {};
                return { ...deletion, ...editingClear, ...clusterPrune };
            });
        },

        setNodes: (nodes: CanvasNode[]) => set({ nodes }),

        insertNodeAtIndex: (node: CanvasNode, index: number) =>
            set((s) => ({ nodes: insertNodeAtIndexInArray(s.nodes, node, index) })),

        insertNodesAtIndices: (entries: Array<{ node: CanvasNode; index: number }>) =>
            set((s) => {
                let nodes = s.nodes;
                for (const { node, index } of entries) {
                    nodes = insertNodeAtIndexInArray(nodes, node, index);
                }
                return { nodes };
            }),

        deleteNodes: (nodeIds: string[]) => {
            const idSet = new Set(nodeIds);
            set((s) => {
                const deletion = deleteNodesFromArrays(s.nodes, s.edges, s.selectedNodeIds, idSet);
                const editingClear = s.editingNodeId && idSet.has(s.editingNodeId)
                    ? { editingNodeId: null, draftContent: null, inputMode: DEFAULT_INPUT_MODE }
                    : {};
                const clusterPrune = s.clusterGroups.length > 0
                    ? pruneClusterGroups(s.clusterGroups, new Set(deletion.nodes.map((n) => n.id)))
                    : {};
                return { ...deletion, ...editingClear, ...clusterPrune };
            });
        },

        clearCanvas: () => set({
            nodes: [], edges: [], selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
            viewport: DEFAULT_VIEWPORT,
            editingNodeId: null, draftContent: null, inputMode: DEFAULT_INPUT_MODE,
            clusterGroups: [],
        }),
    };
}

// ---------------------------------------------------------------------------
// Node data actions (field updates, toggles, flags)
// ---------------------------------------------------------------------------

export function createNodeDataActions(set: SetFn) {
    return {
        updateNodeHeading: (nodeId: string, heading: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'heading', heading) })),

        updateNodePrompt: (nodeId: string, prompt: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'prompt', prompt) })),

        updateNodeOutput: (nodeId: string, output: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'output', output) })),

        updateNodeTags: (nodeId: string, tags: string[]) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'tags', tags) })),

        updateNodeAttachments: (nodeId: string, attachments: IdeaNodeData['attachments']) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'attachments', attachments) })),

        updateNodeColor: (nodeId: string, colorKey: NodeColorKey) =>
            set((s) => ({ nodes: setNodeColorInArray(s.nodes, nodeId, colorKey) })),

        appendToNodeOutput: (nodeId: string, chunk: string) =>
            set((s) => ({ nodes: appendToNodeOutputInArray(s.nodes, nodeId, chunk) })),

        setNodeGenerating: (nodeId: string, isGenerating: boolean) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'isGenerating', isGenerating) })),

        togglePromptCollapsed: (nodeId: string) =>
            set((s) => ({ nodes: togglePromptCollapsedInArray(s.nodes, nodeId) })),

        toggleNodePinned: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodePinnedInArray(s.nodes, nodeId) })),

        toggleNodeCollapsed: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodeCollapsedInArray(s.nodes, nodeId) })),

        toggleNodePoolMembership: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodePoolInArray(s.nodes, nodeId) })),

        clearAllNodePool: () =>
            set((s) => ({ nodes: clearAllNodePoolInArray(s.nodes) })),

        setNodeCalendarEvent: (nodeId: string, event: CalendarEventMetadata | undefined) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'calendarEvent', event) })),
    };
}

// ---------------------------------------------------------------------------
// Edge, layout, and query actions
// ---------------------------------------------------------------------------

export function createEdgeAndLayoutActions(set: SetFn, get: GetFn) {
    return {
        addEdge: (edge: CanvasEdge) => set((s) => ({ edges: [...s.edges, edge] })),

        deleteEdge: (edgeId: string) =>
            set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

        setEdges: (edges: CanvasEdge[]) => set({ edges }),

        arrangeNodes: () => set((s) => ({ nodes: arrangeNodesInGrid(s.nodes) })),

        arrangeAfterResize: (nodeId: string) =>
            set((s) => ({ nodes: arrangeNodesAfterResize(s.nodes, nodeId) })),

        setViewport: (viewport: Viewport) => set({ viewport }),

        getConnectedNodes: (nodeId: string) => getConnectedNodeIds(get().edges, nodeId),

        getUpstreamNodes: (nodeId: string) => {
            const { nodes, edges } = get();
            return getUpstreamNodesFromArrays(nodes, edges, nodeId);
        },
    };
}

// ---------------------------------------------------------------------------
// Selection actions (decoupled from nodes array for performance)
// ---------------------------------------------------------------------------

export function createSelectionActions(set: SetFn, get: GetFn) {
    return {
        selectNode: (nodeId: string) =>
            set((s) => ({ selectedNodeIds: new Set([...s.selectedNodeIds, nodeId]) })),

        deselectNode: (nodeId: string) =>
            set((s) => {
                const newSet = new Set(s.selectedNodeIds);
                newSet.delete(nodeId);
                return { selectedNodeIds: newSet };
            }),

        clearSelection: () => {
            if (get().selectedNodeIds.size === 0) return;
            set({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
        },
    };
}

// ---------------------------------------------------------------------------
// Editing state actions
// ---------------------------------------------------------------------------

export function createEditingActions(set: SetFn, get: GetFn) {
    return {
        startEditing: (nodeId: string) => {
            if (get().editingNodeId === nodeId) return;
            set({ editingNodeId: nodeId, draftContent: null, inputMode: DEFAULT_INPUT_MODE });
        },

        stopEditing: () => {
            const s = get();
            if (s.editingNodeId === null && s.draftContent === null && s.inputMode === DEFAULT_INPUT_MODE) return;
            set({ editingNodeId: null, draftContent: null, inputMode: DEFAULT_INPUT_MODE });
        },

        updateDraft: (content: string) => set({ draftContent: content }),

        setInputMode: (mode: InputMode) => set({ inputMode: mode }),
    };
}

// ---------------------------------------------------------------------------
// Link preview actions
// ---------------------------------------------------------------------------

export function createLinkPreviewActions(set: SetFn) {
    return {
        addLinkPreview: (nodeId: string, url: string, metadata: LinkPreviewMetadata) =>
            set((s) => ({
                nodes: s.nodes.map((node) =>
                    node.id === nodeId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                linkPreviews: { ...node.data.linkPreviews, [url]: metadata },
                            },
                            updatedAt: new Date(),
                        }
                        : node
                ),
            })),

        removeLinkPreview: (nodeId: string, url: string) =>
            set((s) => ({
                nodes: s.nodes.map((node) => {
                    if (node.id !== nodeId) return node;
                    const { [url]: _, ...rest } = node.data.linkPreviews ?? {};
                    return {
                        ...node,
                        data: { ...node.data, linkPreviews: rest },
                        updatedAt: new Date(),
                    };
                }),
            })),
    };
}
