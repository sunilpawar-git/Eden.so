/**
 * Node Model - Type definitions for canvas nodes
 */

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
    [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    type: NodeType;
    data: IdeaNodeData;
    position: NodePosition;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a unified IdeaCard node (prompt + output in one)
 */
export function createIdeaNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    prompt: string = ''
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
        createdAt: now,
        updatedAt: now,
    };
}
