/**
 * Node Storage Cleanup — Deletes Firebase Storage files associated with nodes.
 * Handles images (TipTap content), attachments, and thumbnails.
 * All deletions use allSettled to avoid blocking on missing files.
 */
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { storagePathFromDownloadUrl } from '@/features/canvas/services/storagePathUtils';
import { logger } from '@/shared/services/logger';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { AttachmentMeta } from '@/features/canvas/types/document';

const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com';

/** Extract all Firebase Storage URLs from a string (e.g. markdown/HTML content) */
export function extractStorageUrls(text: string): string[] {
    const urls: string[] = [];
    const regex = /https:\/\/firebasestorage\.googleapis\.com\/[^\s"')}\]]+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        urls.push(match[0]);
    }
    return urls;
}

/** Collect all Firebase Storage URLs referenced by a node's data */
export function collectNodeStorageUrls(node: CanvasNode): string[] {
    const urls: string[] = [];
    const data = node.data as Record<string, unknown> | undefined;
    if (!data) return urls;

    for (const value of Object.values(data)) {
        if (typeof value === 'string' && value.includes(FIREBASE_STORAGE_HOST)) {
            urls.push(...extractStorageUrls(value));
        }
    }

    const attachments = data.attachments as AttachmentMeta[] | undefined;
    if (Array.isArray(attachments)) {
        for (const att of attachments) {
            if (att.url) urls.push(att.url);
            if (att.thumbnailUrl) urls.push(att.thumbnailUrl);
            if (att.parsedTextUrl) urls.push(att.parsedTextUrl);
        }
    }

    return [...new Set(urls)];
}

/** Delete all Storage files referenced by given URLs. Safe and idempotent. */
export async function deleteStorageUrls(urls: string[]): Promise<void> {
    if (urls.length === 0) return;

    await Promise.allSettled(
        urls.map((url) => {
            const path = storagePathFromDownloadUrl(url);
            if (!path) return Promise.resolve();
            return deleteObject(ref(storage, path)).catch(() => {
                /* file may already be deleted — safe to ignore */
            });
        }),
    );
}

/** Delete all Storage files associated with a list of deleted nodes. */
export async function cleanupDeletedNodeStorage(nodes: CanvasNode[]): Promise<void> {
    const allUrls = nodes.flatMap(collectNodeStorageUrls);
    if (allUrls.length === 0) return;
    logger.info(`Cleaning up ${allUrls.length} Storage files from ${nodes.length} deleted nodes`);
    await deleteStorageUrls(allUrls);
}
