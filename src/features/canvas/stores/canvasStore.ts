/**
 * Canvas Store - ViewModel for canvas state (nodes, edges, selection)
 * Performance: Selection state decoupled from nodes array
 */
import { create } from 'zustand';
import type { CanvasNode, NodePosition, LinkPreviewMetadata } from '../types/node';
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
} from './canvasStoreHelpers';

interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    selectedNodeIds: Set<string>;

    // Editing state (SSOT — only one node editable at a time)
    editingNodeId: string | null;
    draftContent: string | null;
    inputMode: InputMode;
}

interface CanvasActions {
    // Node actions
    addNode: (node: CanvasNode) => void;
    updateNodePosition: (nodeId: string, position: NodePosition) => void;
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    deleteNode: (nodeId: string) => void;

    // IdeaNode-specific actions
    updateNodeHeading: (nodeId: string, heading: string) => void;
    updateNodePrompt: (nodeId: string, prompt: string) => void;
    updateNodeOutput: (nodeId: string, output: string) => void;
    updateNodeTags: (nodeId: string, tags: string[]) => void;
    appendToNodeOutput: (nodeId: string, chunk: string) => void;
    setNodeGenerating: (nodeId: string, isGenerating: boolean) => void;
    togglePromptCollapsed: (nodeId: string) => void;
    toggleNodePinned: (nodeId: string) => void;
    toggleNodeCollapsed: (nodeId: string) => void;

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

    // Editing state actions (SSOT for "who is editing")
    startEditing: (nodeId: string) => void;
    stopEditing: () => void;
    updateDraft: (content: string) => void;
    setInputMode: (mode: InputMode) => void;

    // Link preview actions
    addLinkPreview: (nodeId: string, url: string, metadata: LinkPreviewMetadata) => void;
    removeLinkPreview: (nodeId: string, url: string) => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    selectedNodeIds: new Set(),
    editingNodeId: null,
    draftContent: null,
    inputMode: 'note',
};

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
    ...initialState,

    addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

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

    clearSelection: () => set({ selectedNodeIds: new Set() }),

    getConnectedNodes: (nodeId) => getConnectedNodeIds(get().edges, nodeId),

    getUpstreamNodes: (nodeId) => {
        const { nodes, edges } = get();
        return getUpstreamNodesFromArrays(nodes, edges, nodeId);
    },

    setNodes: (nodes) => set({ nodes }),

    setEdges: (edges) => set({ edges }),

    clearCanvas: () => set({
        nodes: [], edges: [], selectedNodeIds: new Set(),
        editingNodeId: null, draftContent: null, inputMode: 'note',
    }),

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
}));
