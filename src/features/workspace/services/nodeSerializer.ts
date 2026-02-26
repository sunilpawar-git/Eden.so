/**
 * Node Serializer - Converts CanvasNode Date fields for localStorage
 * SOLID SRP: Single responsibility for serialization logic
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import { normalizeNodeColorKey } from '@/features/canvas/types/node';
import type { SerializedNode } from '../types/offlineQueue';

/** Convert CanvasNode[] to serializable format (Date → epoch ms) */
export function serializeNodes(nodes: CanvasNode[]): SerializedNode[] {
    return nodes.map((node) => ({
        id: node.id,
        workspaceId: node.workspaceId,
        type: node.type,
        data: node.data as Record<string, unknown>,
        position: node.position,
        width: node.width,
        height: node.height,
        createdAt: node.createdAt.getTime(),
        updatedAt: node.updatedAt.getTime(),
    }));
}

/** Convert serialized nodes back to CanvasNode[] (epoch ms → Date) */
export function deserializeNodes(serialized: SerializedNode[]): CanvasNode[] {
    return serialized.map((node) => ({
        id: node.id,
        workspaceId: node.workspaceId,
        type: node.type as CanvasNode['type'],
        data: {
            ...(node.data as CanvasNode['data']),
            colorKey: normalizeNodeColorKey((node.data as CanvasNode['data']).colorKey),
        },
        position: node.position,
        width: node.width,
        height: node.height,
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
    }));
}
