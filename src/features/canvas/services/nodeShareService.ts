/**
 * Node Share Service — Cross-workspace node sharing via Firestore
 * Deep clones a node, assigns it to the target workspace with smart positioning,
 * and persists atomically via appendNode (single-doc write, no read-then-save race).
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import { loadNodes, appendNode, updateWorkspaceNodeCount } from '@/features/workspace/services/workspaceService';
import { buildClonedNode } from './nodeCloneUtils';
import type { CanvasNode, NodePosition } from '../types/node';

/** Offset applied to place shared node beyond existing nodes (px) */
const SHARE_OFFSET = 80;
/** Default position when target workspace is empty */
const DEFAULT_POSITION: NodePosition = { x: 100, y: 100 };

/**
 * Computes a non-overlapping position for a shared node in the target workspace.
 * Places the node offset from the bottommost-rightmost existing node.
 * Falls back to (100, 100) for empty workspaces.
 */
export function computeSharePosition(existingNodes: CanvasNode[]): NodePosition {
    if (existingNodes.length === 0) return { ...DEFAULT_POSITION };
    const maxX = Math.max(...existingNodes.map((n) => n.position.x));
    const maxY = Math.max(...existingNodes.map((n) => n.position.y));
    return { x: maxX + SHARE_OFFSET, y: maxY + SHARE_OFFSET };
}

/**
 * Shares a node to another workspace owned by the same user.
 * Deep clones the source node, assigns a new collision-safe UUID, strips transient state,
 * computes smart positioning, and persists atomically to Firestore.
 *
 * @param userId - The authenticated user's UID
 * @param sourceNode - The node to share
 * @param targetWorkspaceId - Destination workspace ID
 * @returns The new node's ID
 * @throws If userId/targetWorkspaceId is empty or Firestore operations fail
 */
export async function shareNodeToWorkspace(
    userId: string,
    sourceNode: CanvasNode,
    targetWorkspaceId: string,
): Promise<string> {
    if (!userId) throw new Error('Not authenticated');
    if (!targetWorkspaceId) throw new Error('Invalid workspace');

    const existingNodes = await loadNodes(userId, targetWorkspaceId);
    const position = computeSharePosition(existingNodes);

    const newNode = buildClonedNode(sourceNode, { workspaceId: targetWorkspaceId, position });

    await appendNode(userId, targetWorkspaceId, newNode);
    await updateWorkspaceNodeCount(userId, targetWorkspaceId, existingNodes.length + 1);
    return newNode.id;
}
