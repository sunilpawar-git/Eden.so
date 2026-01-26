/**
 * Node Model - Strict type definitions for canvas nodes
 */

export type NodeType = 'prompt' | 'ai_output' | 'derived' | 'media';

export interface NodePosition {
    x: number;
    y: number;
}

export interface NodeData {
    content: string;
    isGenerating?: boolean;
    [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    type: NodeType;
    data: NodeData;
    position: NodePosition;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a new prompt node
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
 * Create an AI output node
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
