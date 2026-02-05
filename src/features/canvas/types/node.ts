/**
 * Node Model - Type definitions for canvas nodes
 */

/**
 * Default dimensions for new nodes (in pixels)
 * SSOT: These constants are the single source of truth for node sizing
 */
export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_NODE_HEIGHT = 120;

/**
 * Node types - 'idea' is the primary type for IdeaCard nodes
 */
export type NodeType = 'idea' | 'media';

export interface NodePosition {
    x: number;
    y: number;
}

/**
 * Data structure for IdeaCard nodes (unified prompt + output)
 */
export interface IdeaNodeData {
    prompt: string;
    output?: string;
    isGenerating?: boolean;
    isPromptCollapsed?: boolean;
    tags?: string[]; // Tag IDs for BASB organization
    [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    type: NodeType;
    data: IdeaNodeData;
    position: NodePosition;
    width?: number;
    height?: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a unified IdeaCard node (prompt + output in one)
 * Returns node with default dimensions for consistent sizing
 */
export function createIdeaNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    prompt = ''
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'idea',
        data: {
            prompt,
            output: undefined,
            isGenerating: false,
            isPromptCollapsed: false,
        },
        position,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        createdAt: now,
        updatedAt: now,
    };
}

