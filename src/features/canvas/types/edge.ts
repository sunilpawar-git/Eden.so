/**
 * Edge Model - Strict type definitions for canvas edges (connections)
 */

export type RelationshipType = 'related' | 'derived';

export interface CanvasEdge {
    id: string;
    workspaceId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: RelationshipType;
}

/**
 * Create a new edge between nodes
 */
export function createEdge(
    id: string,
    workspaceId: string,
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType: RelationshipType = 'related'
): CanvasEdge {
    return {
        id,
        workspaceId,
        sourceNodeId,
        targetNodeId,
        relationshipType,
    };
}
