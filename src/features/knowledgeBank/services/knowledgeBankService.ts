/**
 * Knowledge Bank Service — Firestore persistence
 * Handles CRUD operations for KB entries in a workspace subcollection
 */
import {
    doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { KnowledgeBankEntry, KnowledgeBankEntryInput } from '../types/knowledgeBank';
import { KB_MAX_ENTRIES, KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { sanitizeContent } from '../utils/sanitizer';

// ── Firestore Paths ────────────────────────────────────

const getKBCollectionRef = (userId: string, workspaceId: string) =>
    collection(db, 'users', userId, 'workspaces', workspaceId, 'knowledgeBank');

const getKBDocRef = (userId: string, workspaceId: string, entryId: string) =>
    doc(db, 'users', userId, 'workspaces', workspaceId, 'knowledgeBank', entryId);

// ── Validation ─────────────────────────────────────────

function validateEntry(input: KnowledgeBankEntryInput): void {
    if (!input.title.trim()) {
        throw new Error(strings.knowledgeBank.errors.titleRequired);
    }
    if (input.content.length > KB_MAX_CONTENT_SIZE) {
        throw new Error(strings.knowledgeBank.errors.contentTooLarge);
    }
}

// ── CRUD Operations ────────────────────────────────────

/** Add a new entry to the Knowledge Bank */
export async function addKBEntry(
    userId: string,
    workspaceId: string,
    input: KnowledgeBankEntryInput,
    preGeneratedId?: string,
    currentCount?: number
): Promise<KnowledgeBankEntry> {
    validateEntry(input);

    // Use caller-provided count when available (avoids N+1 Firestore read)
    const count = currentCount ?? (await loadKBEntries(userId, workspaceId)).length;
    if (count >= KB_MAX_ENTRIES) {
        throw new Error(strings.knowledgeBank.errors.maxEntries);
    }

    const entryId = preGeneratedId ?? `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const entry: KnowledgeBankEntry = {
        id: entryId,
        workspaceId,
        type: input.type,
        title: sanitizeContent(input.title.trim()),
        content: sanitizeContent(input.content),
        originalFileName: input.originalFileName,
        storageUrl: input.storageUrl,
        mimeType: input.mimeType,
        enabled: true,
        createdAt: now,
        updatedAt: now,
    };

    await setDoc(getKBDocRef(userId, workspaceId, entryId), {
        ...entry,
        updatedAt: serverTimestamp(),
    });

    return entry;
}

/** Update an existing entry */
export async function updateKBEntry(
    userId: string,
    workspaceId: string,
    entryId: string,
    updates: Partial<Pick<KnowledgeBankEntry, 'title' | 'content' | 'enabled'>>
): Promise<void> {
    if (updates.title !== undefined && !updates.title.trim()) {
        throw new Error(strings.knowledgeBank.errors.titleRequired);
    }
    if (updates.content !== undefined && updates.content.length > KB_MAX_CONTENT_SIZE) {
        throw new Error(strings.knowledgeBank.errors.contentTooLarge);
    }

    const sanitizedUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) sanitizedUpdates.title = sanitizeContent(updates.title.trim());
    if (updates.content !== undefined) sanitizedUpdates.content = sanitizeContent(updates.content);
    if (updates.enabled !== undefined) sanitizedUpdates.enabled = updates.enabled;

    await setDoc(getKBDocRef(userId, workspaceId, entryId), sanitizedUpdates, { merge: true });
}

/** Delete an entry */
export async function deleteKBEntry(
    userId: string,
    workspaceId: string,
    entryId: string
): Promise<void> {
    await deleteDoc(getKBDocRef(userId, workspaceId, entryId));
}

/** Load all entries for a workspace */
export async function loadKBEntries(
    userId: string,
    workspaceId: string
): Promise<KnowledgeBankEntry[]> {
    const snapshot = await getDocs(getKBCollectionRef(userId, workspaceId));
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Firestore DocumentData */
        return {
            id: docSnapshot.id,
            workspaceId,
            type: data.type,
            title: data.title,
            content: data.content,
            originalFileName: data.originalFileName,
            storageUrl: data.storageUrl,
            mimeType: data.mimeType,
            enabled: data.enabled ?? true,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        } as KnowledgeBankEntry;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    });
}

/** Delete ALL entries for a workspace (used on workspace deletion) */
export async function deleteAllKBEntries(
    userId: string,
    workspaceId: string
): Promise<void> {
    const snapshot = await getDocs(getKBCollectionRef(userId, workspaceId));
    const deletions = snapshot.docs.map(async (d) => {
        // Clean up Storage files for image entries
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Firestore DocumentData */
        const data = d.data();
        if (data.originalFileName && data.type === 'image') {
            const { deleteKBFile } = await import('./storageService');
            await deleteKBFile(userId, workspaceId, d.id, data.originalFileName as string);
        }
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        await deleteDoc(d.ref);
    });
    await Promise.all(deletions);
}
