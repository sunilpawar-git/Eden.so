/**
 * Workspace Service - Firestore persistence for workspaces
 */
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Workspace } from '../types/workspace';
import { createWorkspace } from '../types/workspace';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

/** Remove undefined values recursively (Firebase rejects undefined at any depth) */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
                k,
                // Recursively clean nested plain objects (skip arrays, Dates, primitives)
                typeof v === 'object' && v && !Array.isArray(v) && !(v instanceof Date)
                    ? removeUndefined(v as Record<string, unknown>)
                    : v,
            ])
    ) as T;
}

/** Get Firestore path for workspace subcollection */
const getSubcollectionRef = (userId: string, workspaceId: string, subcollection: string) =>
    collection(db, 'users', userId, 'workspaces', workspaceId, subcollection);

/** Get Firestore path for workspace subcollection document */
const getSubcollectionDocRef = (userId: string, workspaceId: string, subcollection: string, docId: string) =>
    doc(db, 'users', userId, 'workspaces', workspaceId, subcollection, docId);

/** Create a new workspace and save to Firestore */
export async function createNewWorkspace(userId: string, name?: string): Promise<Workspace> {
    const workspaceId = `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const workspace = createWorkspace(workspaceId, userId, name ?? strings.workspace.untitled);
    await saveWorkspace(userId, workspace);
    return workspace;
}

/** Save workspace metadata to Firestore */
export async function saveWorkspace(userId: string, workspace: Workspace): Promise<void> {
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspace.id);
    await setDoc(workspaceRef, {
        id: workspace.id,
        name: workspace.name,
        canvasSettings: workspace.canvasSettings,
        createdAt: workspace.createdAt,
        updatedAt: serverTimestamp(),
    });
}

/** Firestore workspace document shape */
interface WorkspaceDoc {
    id: string;
    name: string;
    canvasSettings?: Workspace['canvasSettings'];
    createdAt?: { toDate?: () => Date };
    updatedAt?: { toDate?: () => Date };
}

/** Load workspace from Firestore */
export async function loadWorkspace(userId: string, workspaceId: string): Promise<Workspace | null> {
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspaceId);
    const snapshot = await getDoc(workspaceRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as WorkspaceDoc;
    return {
        id: data.id,
        userId,
        name: data.name,
        canvasSettings: data.canvasSettings ?? { backgroundColor: 'grid' },
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
}

/** Load all workspaces for a user from Firestore */
export async function loadUserWorkspaces(userId: string): Promise<Workspace[]> {
    const workspacesRef = collection(db, 'users', userId, 'workspaces');
    const snapshot = await getDocs(workspacesRef);
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as WorkspaceDoc;
        return {
            id: data.id,
            userId,
            name: data.name,
            canvasSettings: data.canvasSettings ?? { backgroundColor: 'grid' },
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        };
    });
}

/** Save nodes to Firestore using batch write with delete sync */
export async function saveNodes(userId: string, workspaceId: string, nodes: CanvasNode[]): Promise<void> {
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const existingSnapshot = await getDocs(nodesRef);
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(nodes.map((n) => n.id));

    const batch = writeBatch(db);

    // Delete nodes that no longer exist locally
    existingIds.forEach((existingId) => {
        if (!currentIds.has(existingId)) {
            batch.delete(getSubcollectionDocRef(userId, workspaceId, 'nodes', existingId));
        }
    });

    // Save current nodes (sanitize undefined values for Firebase)
    nodes.forEach((node) => {
        const sanitizedData = removeUndefined(node.data as Record<string, unknown>);
        const nodeDoc = removeUndefined({
            id: node.id, type: node.type, data: sanitizedData, position: node.position,
            width: node.width, height: node.height, createdAt: node.createdAt, updatedAt: serverTimestamp(),
        });
        batch.set(getSubcollectionDocRef(userId, workspaceId, 'nodes', node.id), nodeDoc);
    });

    await batch.commit();
}

/** Save edges to Firestore using batch write with delete sync */
export async function saveEdges(userId: string, workspaceId: string, edges: CanvasEdge[]): Promise<void> {
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');
    const existingSnapshot = await getDocs(edgesRef);
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(edges.map((e) => e.id));

    const batch = writeBatch(db);

    // Delete edges that no longer exist locally
    existingIds.forEach((existingId) => {
        if (!currentIds.has(existingId)) {
            batch.delete(getSubcollectionDocRef(userId, workspaceId, 'edges', existingId));
        }
    });

    // Save current edges
    edges.forEach((edge) => {
        batch.set(getSubcollectionDocRef(userId, workspaceId, 'edges', edge.id), {
            id: edge.id, sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId, relationshipType: edge.relationshipType,
        });
    });

    await batch.commit();
}

/** Load nodes from Firestore */
export async function loadNodes(userId: string, workspaceId: string): Promise<CanvasNode[]> {
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const snapshot = await getDocs(nodesRef);
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Firestore DocumentData fields */
        return {
            id: data.id, workspaceId, type: data.type, data: data.data, position: data.position,
            width: data.width, height: data.height,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        } as CanvasNode;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    });
}

/** Load edges from Firestore */
export async function loadEdges(userId: string, workspaceId: string): Promise<CanvasEdge[]> {
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');
    const snapshot = await getDocs(edgesRef);
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Firestore DocumentData fields */
        return {
            id: data.id, sourceNodeId: data.sourceNodeId,
            targetNodeId: data.targetNodeId, relationshipType: data.relationshipType,
        } as CanvasEdge;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
}

/** Delete a workspace and all its contents (nodes, edges, KB entries) */
export async function deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    // Clean up Knowledge Bank entries first (separate subcollection)
    const { deleteAllKBEntries } = await import('@/features/knowledgeBank/services/knowledgeBankService');
    await deleteAllKBEntries(userId, workspaceId);

    const batch = writeBatch(db);

    // 1. Get all nodes and edges for this workspace
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');

    const [nodesSnapshot, edgesSnapshot] = await Promise.all([
        getDocs(nodesRef),
        getDocs(edgesRef)
    ]);

    // 2. Queue all nodes for deletion
    nodesSnapshot.docs.forEach((d) => batch.delete(d.ref));

    // 3. Queue all edges for deletion
    edgesSnapshot.docs.forEach((d) => batch.delete(d.ref));

    // 4. Queue the workspace document itself
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspaceId);
    batch.delete(workspaceRef);

    // 5. Commit batch
    await batch.commit();
}
