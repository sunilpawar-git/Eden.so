/**
 * Canvas Store - ViewModel for canvas state (nodes, edges, selection)
 * Performance: Selection state decoupled from nodes array
 */
import { create } from 'zustand';
import type { CanvasNode, NodePosition } from '../types/node';
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
} from './canvasStoreHelpers';

interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    selectedNodeIds: Set<string>;
}

interface CanvasActions {
    // Node actions
    addNode: (node: CanvasNode) => void;
    updateNodePosition: (nodeId: string, position: NodePosition) => void;
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    deleteNode: (nodeId: string) => void;

    // IdeaNode-specific actions
    updateNodePrompt: (nodeId: string, prompt: string) => void;
    updateNodeOutput: (nodeId: string, output: string) => void;
    updateNodeTags: (nodeId: string, tags: string[]) => void;
    appendToNodeOutput: (nodeId: string, chunk: string) => void;
    setNodeGenerating: (nodeId: string, isGenerating: boolean) => void;
    togglePromptCollapsed: (nodeId: string) => void;

    // Edge actions
    addEdge: (edge: CanvasEdge) => void;
    deleteEdge: (edgeId: string) => void;

    // Layout actions
    arrangeNodes: () => void;

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
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    selectedNodeIds: new Set(),
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

    deleteNode: (nodeId) =>
        set((s) => deleteNodeFromArrays(s.nodes, s.edges, s.selectedNodeIds, nodeId)),

    addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

    deleteEdge: (edgeId) =>
        set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

    arrangeNodes: () => set((s) => ({ nodes: arrangeNodesInGrid(s.nodes) })),

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

    clearCanvas: () => set({ nodes: [], edges: [], selectedNodeIds: new Set() }),
}));
