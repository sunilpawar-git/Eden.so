/**
 * Node Share Service — Cross-workspace node sharing via Firestore
 * Deep clones a node, positions it at the next masonry grid slot in the target workspace,
 * and persists atomically via appendNode (single-doc write, no read-then-save race).
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import { loadNodes, appendNode, updateWorkspaceNodeCount } from '@/features/workspace/services/workspaceService';
import { buildClonedNode } from './nodeCloneUtils';
import { calculateMasonryPosition } from './gridLayoutService';
import type { CanvasNode } from '../types/node';

/**
 * Shares a node to another workspace owned by the same user.
 * Deep clones the source node, assigns a new collision-safe UUID, strips transient state,
 * positions at the next masonry grid slot, and persists atomically to Firestore.
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
    const position = calculateMasonryPosition(existingNodes);

    const newNode = buildClonedNode(sourceNode, { workspaceId: targetWorkspaceId, position });

    await appendNode(userId, targetWorkspaceId, newNode);
    await updateWorkspaceNodeCount(userId, targetWorkspaceId, existingNodes.length + 1);
    return newNode.id;
}
