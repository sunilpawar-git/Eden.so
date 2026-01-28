/**
 * Canvas Store - ViewModel for canvas state (nodes, edges, selection)
 * Performance: Selection state decoupled from nodes array
 */
import { create } from 'zustand';
import type { CanvasNode, NodePosition } from '../types/node';
import type { CanvasEdge } from '../types/edge';

interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    selectedNodeIds: Set<string>;
}

interface CanvasActions {
    // Node actions
    addNode: (node: CanvasNode) => void;
    updateNodePosition: (nodeId: string, position: NodePosition) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    deleteNode: (nodeId: string) => void;

    // IdeaNode-specific actions
    updateNodeOutput: (nodeId: string, output: string) => void;
    appendToNodeOutput: (nodeId: string, chunk: string) => void;
    setNodeGenerating: (nodeId: string, isGenerating: boolean) => void;
    togglePromptCollapsed: (nodeId: string) => void;

    // Edge actions
    addEdge: (edge: CanvasEdge) => void;
    deleteEdge: (edgeId: string) => void;

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
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    selectedNodeIds: new Set(),
};

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
    ...initialState,

    addNode: (node: CanvasNode) => {
        set((state) => ({
            nodes: [...state.nodes, node],
        }));
    },

    updateNodePosition: (nodeId: string, position: NodePosition) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, position, updatedAt: new Date() }
                    : node
            ),
        }));
    },

    updateNodeContent: (nodeId: string, content: string) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, content }, updatedAt: new Date() }
                    : node
            ),
        }));
    },

    updateNodeOutput: (nodeId: string, output: string) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, output }, updatedAt: new Date() }
                    : node
            ),
        }));
    },

    appendToNodeOutput: (nodeId: string, chunk: string) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? {
                          ...node,
                          data: {
                              ...node.data,
                              output: (node.data.output as string | undefined ?? '') + chunk,
                          },
                          updatedAt: new Date(),
                      }
                    : node
            ),
        }));
    },

    setNodeGenerating: (nodeId: string, isGenerating: boolean) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, isGenerating }, updatedAt: new Date() }
                    : node
            ),
        }));
    },

    togglePromptCollapsed: (nodeId: string) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? {
                          ...node,
                          data: {
                              ...node.data,
                              isPromptCollapsed: !node.data.isPromptCollapsed,
                          },
                          updatedAt: new Date(),
                      }
                    : node
            ),
        }));
    },

    deleteNode: (nodeId: string) => {
        set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
                (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
            ),
            selectedNodeIds: new Set(
                [...state.selectedNodeIds].filter((id) => id !== nodeId)
            ),
        }));
    },

    addEdge: (edge: CanvasEdge) => {
        set((state) => ({
            edges: [...state.edges, edge],
        }));
    },

    deleteEdge: (edgeId: string) => {
        set((state) => ({
            edges: state.edges.filter((edge) => edge.id !== edgeId),
        }));
    },

    selectNode: (nodeId: string) => {
        set((state) => ({
            selectedNodeIds: new Set([...state.selectedNodeIds, nodeId]),
        }));
    },

    deselectNode: (nodeId: string) => {
        set((state) => {
            const newSet = new Set(state.selectedNodeIds);
            newSet.delete(nodeId);
            return { selectedNodeIds: newSet };
        });
    },

    clearSelection: () => {
        set({ selectedNodeIds: new Set() });
    },

    getConnectedNodes: (nodeId: string) => {
        const { edges } = get();
        const connected: string[] = [];

        edges.forEach((edge) => {
            if (edge.sourceNodeId === nodeId) {
                connected.push(edge.targetNodeId);
            }
            if (edge.targetNodeId === nodeId) {
                connected.push(edge.sourceNodeId);
            }
        });

        return connected;
    },

    getUpstreamNodes: (nodeId: string) => {
        const { nodes, edges } = get();
        const visited = new Set<string>();
        const queue: string[] = [nodeId];
        const upstream: CanvasNode[] = [];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Find all incoming edges to current node
            const incomingEdges = edges.filter((e) => e.targetNodeId === currentId);
            for (const edge of incomingEdges) {
                const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
                if (sourceNode && !visited.has(sourceNode.id)) {
                    upstream.push(sourceNode);
                    queue.push(sourceNode.id);
                }
            }
        }
        return upstream;
    },

    setNodes: (nodes: CanvasNode[]) => {
        set({ nodes });
    },

    setEdges: (edges: CanvasEdge[]) => {
        set({ edges });
    },
}));
