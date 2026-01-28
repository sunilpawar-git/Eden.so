/**
 * Node Model - Strict type definitions for canvas nodes
 */

/**
 * Node types:
 * - 'idea': Unified IdeaCard (prompt + output in one) - PRIMARY
 * - 'prompt', 'ai_output', 'derived': Legacy types for backward compatibility
 * - 'media': Future media nodes
 */
export type NodeType = 'idea' | 'prompt' | 'ai_output' | 'derived' | 'media';

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

/**
 * @deprecated Use IdeaNodeData for new nodes. Kept for backward compatibility.
 */
export interface NodeData {
    content: string;
    isGenerating?: boolean;
    [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    type: NodeType;
    data: NodeData | IdeaNodeData;
    position: NodePosition;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * @deprecated Use createIdeaNode for new nodes
 * Create a new prompt node (legacy)
 */
export function createPromptNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    content: string = ''
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'prompt',
        data: { content },
        position,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * @deprecated Use createIdeaNode for new nodes
 * Create an AI output node (legacy)
 */
export function createAIOutputNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    content: string
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'ai_output',
        data: { content },
        position,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Create a derived (synthesis) node
 * @deprecated Use createIdeaNode for new nodes
 */
export function createDerivedNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    content: string
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'derived',
        data: { content },
        position,
        createdAt: now,
        updatedAt: now,
    };
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
        } as IdeaNodeData,
        position,
        createdAt: now,
        updatedAt: now,
    };
}
