/**
 * Offline Queue Types - Data structures for queued save operations
 */
import type { CanvasEdge } from '@/features/canvas/types/edge';

/** CanvasNode with Date fields serialized to epoch ms for localStorage */
export interface SerializedNode {
    id: string;
    workspaceId: string;
    type: string;
    data: Record<string, unknown>;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    createdAt: number;
    updatedAt: number;
}

/** A queued save operation waiting to be synced to Firestore */
export interface QueuedSaveOperation {
    id: string;
    userId: string;
    workspaceId: string;
    nodes: SerializedNode[];
    edges: CanvasEdge[];
    queuedAt: number;
    retryCount: number;
}
