/**
 * Workspace Service - Firestore persistence for workspaces
 */
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    writeBatch,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Workspace } from '../types/workspace';
import { createWorkspace } from '../types/workspace';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

/**
 * Create a new workspace and save to Firestore
 */
export async function createNewWorkspace(
    userId: string,
    name?: string
): Promise<Workspace> {
    const workspaceId = `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const workspaceName = name || strings.workspace.untitled;
    const workspace = createWorkspace(workspaceId, userId, workspaceName);
    
    await saveWorkspace(userId, workspace);
    
    return workspace;
}

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
 * Load all workspaces for a user from Firestore
 */
export async function loadUserWorkspaces(userId: string): Promise<Workspace[]> {
    const workspacesRef = collection(db, 'users', userId, 'workspaces');
    const snapshot = await getDocs(workspacesRef);

    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
            id: data.id,
            userId,
            name: data.name,
            canvasSettings: data.canvasSettings,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        };
    });
}

/**
 * Save nodes to Firestore using batch write with delete sync
 * Deletes nodes that exist in Firestore but not in the local array
 */
export async function saveNodes(
    userId: string,
    workspaceId: string,
    nodes: CanvasNode[]
): Promise<void> {
    const nodesRef = collection(
        db,
        'users',
        userId,
        'workspaces',
        workspaceId,
        'nodes'
    );

    // Get existing node IDs from Firestore
    const existingSnapshot = await getDocs(nodesRef);
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(nodes.map((n) => n.id));

    const batch = writeBatch(db);

    // Delete nodes that no longer exist locally
    existingIds.forEach((existingId) => {
        if (!currentIds.has(existingId)) {
            const nodeRef = doc(
                db,
                'users',
                userId,
                'workspaces',
                workspaceId,
                'nodes',
                existingId
            );
            batch.delete(nodeRef);
        }
    });

    // Save current nodes
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
            width: node.width,
            height: node.height,
            createdAt: node.createdAt,
            updatedAt: serverTimestamp(),
        });
    });

    await batch.commit();
}

/**
 * Save edges to Firestore using batch write with delete sync
 * Deletes edges that exist in Firestore but not in the local array
 */
export async function saveEdges(
    userId: string,
    workspaceId: string,
    edges: CanvasEdge[]
): Promise<void> {
    const edgesRef = collection(
        db,
        'users',
        userId,
        'workspaces',
        workspaceId,
        'edges'
    );

    // Get existing edge IDs from Firestore
    const existingSnapshot = await getDocs(edgesRef);
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(edges.map((e) => e.id));

    const batch = writeBatch(db);

    // Delete edges that no longer exist locally
    existingIds.forEach((existingId) => {
        if (!currentIds.has(existingId)) {
            const edgeRef = doc(
                db,
                'users',
                userId,
                'workspaces',
                workspaceId,
                'edges',
                existingId
            );
            batch.delete(edgeRef);
        }
    });

    // Save current edges
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

/**
 * Load nodes from Firestore
 */
export async function loadNodes(
    userId: string,
    workspaceId: string
): Promise<CanvasNode[]> {
    const nodesRef = collection(
        db,
        'users',
        userId,
        'workspaces',
        workspaceId,
        'nodes'
    );
    const snapshot = await getDocs(nodesRef);

    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
            id: data.id,
            workspaceId,
            type: data.type,
            data: data.data,
            position: data.position,
            width: data.width,
            height: data.height,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        } as CanvasNode;
    });
}

/**
 * Load edges from Firestore
 */
export async function loadEdges(
    userId: string,
    workspaceId: string
): Promise<CanvasEdge[]> {
    const edgesRef = collection(
        db,
        'users',
        userId,
        'workspaces',
        workspaceId,
        'edges'
    );
    const snapshot = await getDocs(edgesRef);

    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
            id: data.id,
            sourceNodeId: data.sourceNodeId,
            targetNodeId: data.targetNodeId,
            relationshipType: data.relationshipType,
        } as CanvasEdge;
    });
}
