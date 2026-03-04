import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { ensureEditorFocus } from '../services/imageInsertService';
import { useImageInsert } from './useImageInsert';
import { useDocumentInsert } from './useDocumentInsert';
import { useNodeDocumentUpload } from './useNodeDocumentUpload';
import { useDocumentAgent } from '@/features/documentAgent/hooks/useDocumentAgent';
import { useOfflineQueue } from '@/features/documentAgent/hooks/useOfflineQueue';
import { resolveAnalyzeCommand } from '@/features/documentAgent/services/analyzeCommandService';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import type { DocumentInsertFn } from '../extensions/fileHandlerExtension';

interface Params {
    id: string;
    editor: Editor | null;
    getMarkdown: () => string;
    imageUploadFn: (file: File) => Promise<string>;
}

export function useIdeaCardImageHandlers({ id, editor, getMarkdown, imageUploadFn }: Params) {
    const handleAfterImageInsert = useCallback(() => {
        const md = getMarkdown();
        if (md) useCanvasStore.getState().updateNodeOutput(id, md);
    }, [id, getMarkdown]);

    const { triggerFilePicker: triggerImagePicker } = useImageInsert(editor, imageUploadFn, handleAfterImageInsert);
    const documentUploadFn = useNodeDocumentUpload(id);
    const { analyzeAndSpawn } = useDocumentAgent();

    const processQueueItem = useCallback((item: { nodeId: string; parsedText: string; filename: string; workspaceId: string }) => {
        void analyzeAndSpawn(item.nodeId, item.parsedText, item.filename, item.workspaceId).catch((e: unknown) => captureError(e as Error));
    }, [analyzeAndSpawn]);

    const { enqueueIfOffline } = useOfflineQueue(processQueueItem);

    const onDocumentReady = useCallback((parsedText: string, filename: string) => {
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!workspaceId) return;
        void analyzeAndSpawn(id, parsedText, filename, workspaceId).catch((e: unknown) => captureError(e as Error));
    }, [id, analyzeAndSpawn]);

    const { triggerFilePicker: triggerDocumentPicker, insertFileDirectly } = useDocumentInsert(id, editor, documentUploadFn, getMarkdown, onDocumentReady);

    const documentInsertFn: DocumentInsertFn = useCallback(
        (_editor: Editor, file: File) => insertFileDirectly(file),
        [insertFileDirectly],
    );

    const handleAnalyzeCommand = useCallback(() => {
        const runAnalysis = async () => {
            const { nodes } = useCanvasStore.getState();
            const node = getNodeMap(nodes).get(id);
            const attachments = node?.data.attachments;
            const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
            if (!workspaceId) return;

            const resolved = await resolveAnalyzeCommand(attachments);
            if ('error' in resolved) {
                toast.warning(resolved.error);
                return;
            }
            const { parsedText, filename, isCached } = resolved.result;
            if (isCached) {
                toast.info(strings.documentAgent.cachedResult);
            }
            const canProceed = enqueueIfOffline({ nodeId: id, parsedText, filename, workspaceId });
            if (!canProceed) return;
            await analyzeAndSpawn(id, parsedText, filename, workspaceId);
        };
        void runAnalysis().catch((e: unknown) => captureError(e as Error));
    }, [id, analyzeAndSpawn, enqueueIfOffline]);

    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
        if (c === 'insert-image') triggerImagePicker();
        if (c === 'insert-document') triggerDocumentPicker();
        if (c === 'analyze-document') handleAnalyzeCommand();
    }, [triggerImagePicker, triggerDocumentPicker, handleAnalyzeCommand]);

    const handleImageClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerImagePicker();
    }, [id, editor, triggerImagePicker]);

    const handleAttachmentClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerDocumentPicker();
    }, [id, editor, triggerDocumentPicker]);

    return { slashHandler, handleImageClick, handleAttachmentClick, documentInsertFn };
}
