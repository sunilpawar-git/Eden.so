/**
 * useSynthesis — orchestrates canvas synthesis: graph -> prompt -> Gemini -> node.
 * Synthesis UI state lives in local useReducer (not Zustand).
 */
import { useCallback, useReducer } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { executeSynthesis } from '../services/executeSynthesis';
import { executeReSynthesis } from '../services/reSynthesisHelper';
import { synthesisStrings } from '../strings/synthesisStrings';
import { captureError } from '@/shared/services/sentryService';
import { toast } from '@/shared/stores/toastStore';
import { synthesisReducer, INITIAL_STATE, MAX_SYNTHESIS_NODES, extractErrorMsg } from './synthesisReducer';

export function useSynthesis() {
    const [state, dispatch] = useReducer(synthesisReducer, INITIAL_STATE);
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const { getKBContext } = useKnowledgeBankContext();
    const canSynthesize = selectedNodeIds.size >= 2 && selectedNodeIds.size <= MAX_SYNTHESIS_NODES;

    const synthesize = useCallback(async (mode: SynthesisMode) => {
        if (!workspaceId) {
            toast.error(synthesisStrings.labels.noWorkspace);
            return;
        }
        dispatch({ type: 'START' });
        try {
            await executeSynthesis(mode, workspaceId, getKBContext);
            dispatch({ type: 'COMPLETE' });
        } catch (err) {
            captureError(err, { context: 'synthesis' });
            dispatch({ type: 'ERROR', error: extractErrorMsg(err) });
        }
    }, [workspaceId, getKBContext]);

    const reSynthesize = useCallback(async (nodeId: string, mode?: SynthesisMode) => {
        dispatch({ type: 'START' });
        try {
            await executeReSynthesis(nodeId, mode, getKBContext);
            dispatch({ type: 'COMPLETE' });
        } catch (err) {
            captureError(err, { context: 'reSynthesis' });
            dispatch({ type: 'ERROR', error: extractErrorMsg(err) });
        }
    }, [getKBContext]);

    return {
        synthesize,
        reSynthesize,
        isSynthesizing: state.isSynthesizing,
        error: state.error,
        canSynthesize,
    } as const;
}
