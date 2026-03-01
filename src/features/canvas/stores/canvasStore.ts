/**
 * Canvas Store - ViewModel for canvas state (nodes, edges, selection)
 * Performance: Selection state decoupled from nodes array
 */
import { create } from 'zustand';
import type { Viewport } from '@xyflow/react';
import type { CanvasNode, NodePosition, LinkPreviewMetadata, NodeColorKey } from '../types/node';
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import type { InputMode } from '../types/slashCommand';
import type { CanvasEdge } from '../types/edge';
import {
    updateNodePositionInArray,
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
} from './canvasStoreHelpers';
import { duplicateNode as cloneNode } from '../services/nodeDuplicationService';

/** Stable reference for empty selection — prevents spurious re-renders via Object.is */
export const EMPTY_SELECTED_IDS: ReadonlySet<string> = Object.freeze(new Set<string>());

let _cachedNodes: CanvasNode[] = [];
let _cachedNodeMap: ReadonlyMap<string, CanvasNode> = new Map();

/** Memoized O(1) lookup map — only rebuilds when nodes array reference changes */
export function getNodeMap(nodes: CanvasNode[]): ReadonlyMap<string, CanvasNode> {
    if (nodes !== _cachedNodes) {
        _cachedNodes = nodes;
        _cachedNodeMap = new Map(nodes.map((n) => [n.id, n]));
    }
    return _cachedNodeMap;
}

interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    selectedNodeIds: Set<string>;
    viewport: Viewport;

    // Editing state (SSOT — only one node editable at a time)
    editingNodeId: string | null;
    draftContent: string | null;
    inputMode: InputMode;
}

interface CanvasActions {
    // Node actions
    addNode: (node: CanvasNode) => void;
    duplicateNode: (nodeId: string) => string | undefined;
    updateNodePosition: (nodeId: string, position: NodePosition) => void;
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    deleteNode: (nodeId: string) => void;

    // IdeaNode-specific actions
    updateNodeHeading: (nodeId: string, heading: string) => void;
    updateNodePrompt: (nodeId: string, prompt: string) => void;
    updateNodeOutput: (nodeId: string, output: string) => void;
    updateNodeTags: (nodeId: string, tags: string[]) => void;
    updateNodeColor: (nodeId: string, colorKey: NodeColorKey) => void;
    appendToNodeOutput: (nodeId: string, chunk: string) => void;
    setNodeGenerating: (nodeId: string, isGenerating: boolean) => void;
    togglePromptCollapsed: (nodeId: string) => void;
    toggleNodePinned: (nodeId: string) => void;
    toggleNodeCollapsed: (nodeId: string) => void;
    toggleNodePoolMembership: (nodeId: string) => void;
    clearAllNodePool: () => void;

    // Edge actions
    addEdge: (edge: CanvasEdge) => void;
    deleteEdge: (edgeId: string) => void;

    // Layout actions
    arrangeNodes: () => void;
    arrangeAfterResize: (nodeId: string) => void;

    // Selection actions (decoupled for performance)
    selectNode: (nodeId: string) => void;
    deselectNode: (nodeId: string) => void;
    clearSelection: () => void;

    // Queries
    getConnectedNodes: (nodeId: string) => string[];
    getUpstreamNodes: (nodeId: string) => CanvasNode[];

    // Bulk operations
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    clearCanvas: () => void;

    // Viewport actions
    setViewport: (viewport: Viewport) => void;

    // Editing state actions (SSOT for "who is editing")
    startEditing: (nodeId: string) => void;
    stopEditing: () => void;
    updateDraft: (content: string) => void;
    setInputMode: (mode: InputMode) => void;

    // Link preview actions
    addLinkPreview: (nodeId: string, url: string, metadata: LinkPreviewMetadata) => void;
    removeLinkPreview: (nodeId: string, url: string) => void;

    // Calendar event actions
    setNodeCalendarEvent: (nodeId: string, event: CalendarEventMetadata | undefined) => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
    viewport: { x: 32, y: 32, zoom: 1 },
    editingNodeId: null,
    draftContent: null,
    inputMode: 'note',
};

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
    ...initialState,

    addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

    duplicateNode: (nodeId) => {
        const nodes = get().nodes;
        const node = getNodeMap(nodes).get(nodeId);
        if (!node) return undefined;
        const newNode = cloneNode(node, nodes);
        set((s) => ({ nodes: [...s.nodes, newNode] }));
        return newNode.id;
    },

    updateNodePosition: (nodeId, position) =>
        set((s) => ({ nodes: updateNodePositionInArray(s.nodes, nodeId, position) })),

    updateNodeDimensions: (nodeId, width, height) =>
        set((s) => ({ nodes: updateNodeDimensionsInArray(s.nodes, nodeId, width, height) })),

    updateNodeContent: (nodeId, content) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'content', content) })),

    updateNodeHeading: (nodeId, heading) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'heading', heading) })),

    updateNodePrompt: (nodeId, prompt) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'prompt', prompt) })),

    updateNodeOutput: (nodeId, output) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'output', output) })),

    updateNodeTags: (nodeId, tags) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'tags', tags) })),

    updateNodeColor: (nodeId, colorKey) =>
        set((s) => ({ nodes: setNodeColorInArray(s.nodes, nodeId, colorKey) })),

    appendToNodeOutput: (nodeId, chunk) =>
        set((s) => ({ nodes: appendToNodeOutputInArray(s.nodes, nodeId, chunk) })),

    setNodeGenerating: (nodeId, isGenerating) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'isGenerating', isGenerating) })),

    togglePromptCollapsed: (nodeId) =>
        set((s) => ({ nodes: togglePromptCollapsedInArray(s.nodes, nodeId) })),

    toggleNodePinned: (nodeId) =>
        set((s) => ({ nodes: toggleNodePinnedInArray(s.nodes, nodeId) })),

    toggleNodeCollapsed: (nodeId) =>
        set((s) => ({ nodes: toggleNodeCollapsedInArray(s.nodes, nodeId) })),

    toggleNodePoolMembership: (nodeId) =>
        set((s) => ({ nodes: toggleNodePoolInArray(s.nodes, nodeId) })),

    clearAllNodePool: () =>
        set((s) => ({ nodes: clearAllNodePoolInArray(s.nodes) })),

    deleteNode: (nodeId) =>
        set((s) => ({
            ...deleteNodeFromArrays(s.nodes, s.edges, s.selectedNodeIds, nodeId),
            ...(s.editingNodeId === nodeId
                ? { editingNodeId: null, draftContent: null, inputMode: 'note' as const }
                : {}),
        })),

    addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

    deleteEdge: (edgeId) =>
        set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

    arrangeNodes: () => set((s) => ({ nodes: arrangeNodesInGrid(s.nodes) })),

    arrangeAfterResize: (nodeId) =>
        set((s) => ({ nodes: arrangeNodesAfterResize(s.nodes, nodeId) })),

    selectNode: (nodeId) =>
        set((s) => ({ selectedNodeIds: new Set([...s.selectedNodeIds, nodeId]) })),

    deselectNode: (nodeId) =>
        set((s) => {
            const newSet = new Set(s.selectedNodeIds);
            newSet.delete(nodeId);
            return { selectedNodeIds: newSet };
        }),

    clearSelection: () => {
        if (get().selectedNodeIds.size === 0) return;
        set({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
    },

    getConnectedNodes: (nodeId) => getConnectedNodeIds(get().edges, nodeId),

    getUpstreamNodes: (nodeId) => {
        const { nodes, edges } = get();
        return getUpstreamNodesFromArrays(nodes, edges, nodeId);
    },

    setNodes: (nodes) => set({ nodes }),

    setEdges: (edges) => set({ edges }),

    clearCanvas: () => set({
        nodes: [], edges: [], selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
        viewport: { x: 32, y: 32, zoom: 1 },
        editingNodeId: null, draftContent: null, inputMode: 'note',
    }),

    setViewport: (viewport) => set({ viewport }),

    // Editing state actions
    startEditing: (nodeId) => set({ editingNodeId: nodeId, draftContent: null, inputMode: 'note' }),

    stopEditing: () => set({ editingNodeId: null, draftContent: null, inputMode: 'note' }),

    updateDraft: (content) => set({ draftContent: content }),

    setInputMode: (mode) => set({ inputMode: mode }),

    // Link preview actions
    addLinkPreview: (nodeId, url, metadata) =>
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

    removeLinkPreview: (nodeId, url) =>
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

    setNodeCalendarEvent: (nodeId, event) =>
        set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'calendarEvent', event) })),
}));
