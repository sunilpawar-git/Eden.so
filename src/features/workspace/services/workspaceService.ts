/**
 * Workspace Service - Firestore persistence for workspaces
 */
import {
    doc,
    setDoc,
    getDoc,
    writeBatch,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Workspace } from '../types/workspace';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

/**
 * Save workspace metadata to Firestore
 */
export async function saveWorkspace(
    userId: string,
    workspace: Workspace
): Promise<void> {
    const workspaceRef = doc(
        db,
        'users',
        userId,
        'workspaces',
        workspace.id
    );

    await setDoc(workspaceRef, {
        id: workspace.id,
        name: workspace.name,
        canvasSettings: workspace.canvasSettings,
        createdAt: workspace.createdAt,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Load workspace from Firestore
 */
export async function loadWorkspace(
    userId: string,
    workspaceId: string
): Promise<Workspace | null> {
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspaceId);
    const snapshot = await getDoc(workspaceRef);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data();
    return {
        id: data.id,
        userId,
        name: data.name,
        canvasSettings: data.canvasSettings,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
}

/**
 * Save nodes to Firestore using batch write
 */
export async function saveNodes(
    userId: string,
    workspaceId: string,
    nodes: CanvasNode[]
): Promise<void> {
    const batch = writeBatch(db);

    nodes.forEach((node) => {
        const nodeRef = doc(
            db,
            'users',
            userId,
            'workspaces',
            workspaceId,
            'nodes',
            node.id
        );
        batch.set(nodeRef, {
            id: node.id,
            type: node.type,
            data: node.data,
            position: node.position,
            createdAt: node.createdAt,
            updatedAt: serverTimestamp(),
        });
    });

    await batch.commit();
}

/**
 * Save edges to Firestore using batch write
 */
export async function saveEdges(
    userId: string,
    workspaceId: string,
    edges: CanvasEdge[]
): Promise<void> {
    const batch = writeBatch(db);

    edges.forEach((edge) => {
        const edgeRef = doc(
            db,
            'users',
            userId,
            'workspaces',
            workspaceId,
            'edges',
            edge.id
        );
        batch.set(edgeRef, {
            id: edge.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            relationshipType: edge.relationshipType,
        });
    });

    await batch.commit();
}
