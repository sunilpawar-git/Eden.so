/**
 * useIdeaCardState - Derives editable content, save/submit callbacks
 * Body editor always saves to output. AI prompts are heading-only (SSOT).
 */
import { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../stores/canvasStore';

interface UseIdeaCardStateOptions {
    nodeId: string;
    prompt?: string;
    output: string | undefined;
    isAICard: boolean;
    /** When provided, called after saving prompt in AI mode to trigger generation */
    generateFromPrompt?: (nodeId: string) => void;
}

export function useIdeaCardState({ nodeId, prompt, output, isAICard, generateFromPrompt }: UseIdeaCardStateOptions) {
    const updateNodeOutput = useCanvasStore((s) => s.updateNodeOutput);
    const placeholder = strings.ideaCard.inputPlaceholder;
    // Always edit the output in the body editor. Heading is the SSOT for AI
    // prompts — the legacy `prompt` field should never be loaded into the body.
    const getEditableContent = useCallback(() => output ?? '', [output]);

    const saveContent = useCallback((md: string) => {
        const t = md.trim();
        if (t && t !== getEditableContent()) {
            updateNodeOutput(nodeId, t);
        }
    }, [getEditableContent, nodeId, updateNodeOutput]);

    const onSubmitNote = useCallback((t: string) => {
        updateNodeOutput(nodeId, t); useCanvasStore.getState().stopEditing();
    }, [nodeId, updateNodeOutput]);

    const onSubmitAI = useCallback((_t: string) => {
        // Heading is SSOT for prompts — already saved via handleHeadingChange.
        // No updateNodePrompt needed; just trigger generation.
        useCanvasStore.getState().stopEditing();
        generateFromPrompt?.(nodeId);
    }, [nodeId, generateFromPrompt]);

    return { getEditableContent, saveContent, placeholder, onSubmitNote, onSubmitAI };
}
