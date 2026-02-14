/**
 * useFileProcessor — Processes uploaded files for Knowledge Bank
 * Text files → read as string | Images → compress + upload to Storage
 */
import { useCallback, useState } from 'react';
import { compressImage } from '../utils/imageCompressor';
import { uploadKBFile } from '../services/storageService';
import { addKBEntry } from '../services/knowledgeBankService';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { KB_MAX_FILE_SIZE, KB_ACCEPTED_MIME_TYPES } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

/** Validate file type and size */
function validateFile(file: File): string | null {
    if (file.size > KB_MAX_FILE_SIZE) {
        return strings.knowledgeBank.errors.fileTooLarge;
    }
    const mimeType = file.type || '';
    const isAccepted = KB_ACCEPTED_MIME_TYPES.some((t) => t === mimeType);
    if (!isAccepted) {
        return strings.knowledgeBank.errors.unsupportedType;
    }
    return null;
}

export function useFileProcessor() {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFile = useCallback(async (file: File) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const validationError = validateFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setIsProcessing(true);
        try {
            if (file.type.startsWith('image/')) {
                await processImageFile(file, userId, workspaceId);
            } else {
                await processTextFile(file, userId, workspaceId);
            }
        } catch (error) {
            const msg = error instanceof Error
                ? error.message
                : strings.knowledgeBank.errors.uploadFailed;
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return { processFile, isProcessing };
}

/** Read text file content and save as KB entry */
async function processTextFile(
    file: File, userId: string, workspaceId: string
): Promise<void> {
    const text = await file.text();
    const title = file.name.replace(/\.[^/.]+$/, '');

    const count = useKnowledgeBankStore.getState().entries.length;
    const entry = await addKBEntry(userId, workspaceId, {
        type: 'text',
        title,
        content: text,
        originalFileName: file.name,
        mimeType: file.type,
    }, undefined, count);
    useKnowledgeBankStore.getState().addEntry(entry);
    toast.success(strings.knowledgeBank.saveEntry);
}

/** Compress image, upload to Firebase Storage, save as KB entry */
async function processImageFile(
    file: File, userId: string, workspaceId: string
): Promise<void> {
    const compressed = await compressImage(file);

    const entryId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const filename = `${file.name.replace(/\.[^/.]+$/, '')}.jpg`;

    const storageUrl = await uploadKBFile(userId, workspaceId, entryId, compressed, filename, 'image/jpeg');

    const description = `Image: ${file.name}`;

    const count = useKnowledgeBankStore.getState().entries.length;
    const entry = await addKBEntry(userId, workspaceId, {
        type: 'image',
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: description,
        originalFileName: file.name,
        storageUrl,
        mimeType: 'image/jpeg',
    }, entryId, count);
    useKnowledgeBankStore.getState().addEntry(entry);
    toast.success(strings.knowledgeBank.saveEntry);
}
