/**
 * Image Upload Service — Validates, compresses, and uploads node images
 * Reuses shared sanitizeFilename and KB imageCompressor (DRY)
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { sanitizeFilename } from '@/shared/utils/sanitize';
import { compressImage } from '@/features/knowledgeBank/utils/imageCompressor';
import { IMAGE_ACCEPTED_MIME_TYPES, IMAGE_MAX_FILE_SIZE } from '../types/image';
import { strings } from '@/shared/localization/strings';

/** Check whether a MIME type is in the allowed list */
export function isAcceptedImageType(mimeType: string): boolean {
    return (IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Validate an image file before upload.
 * Throws localized error on failure.
 */
export function validateImageFile(file: File): void {
    if (file.size > IMAGE_MAX_FILE_SIZE) {
        throw new Error(strings.canvas.imageFileTooLarge);
    }
    if (!isAcceptedImageType(file.type)) {
        throw new Error(strings.canvas.imageUnsupportedType);
    }
}

/** Build the Firebase Storage path for a node image */
export function buildNodeImagePath(
    userId: string,
    workspaceId: string,
    nodeId: string,
    filename: string,
): string {
    const safeName = sanitizeFilename(filename);
    return `users/${userId}/workspaces/${workspaceId}/nodes/${nodeId}/images/${safeName}`;
}

/**
 * Upload a node image: validate, compress, store in Firebase Storage.
 * @returns The public download URL for the uploaded image.
 */
export async function uploadNodeImage(
    userId: string,
    workspaceId: string,
    nodeId: string,
    file: File,
): Promise<string> {
    validateImageFile(file);
    const compressed = await compressImage(file);
    const path = buildNodeImagePath(userId, workspaceId, nodeId, file.name);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, compressed);
    return getDownloadURL(storageRef);
}
