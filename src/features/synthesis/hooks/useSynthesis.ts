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

interface SynthesisState {
    readonly isSynthesizing: boolean;
    readonly error: string | null;
}

type SynthesisAction =
    | { type: 'START' }
    | { type: 'COMPLETE' }
    | { type: 'ERROR'; error: string };

function synthesisReducer(_: SynthesisState, action: SynthesisAction): SynthesisState {
    switch (action.type) {
        case 'START': return { isSynthesizing: true, error: null };
        case 'COMPLETE': return { isSynthesizing: false, error: null };
        case 'ERROR': return { isSynthesizing: false, error: action.error };
    }
}

const INITIAL_STATE: SynthesisState = { isSynthesizing: false, error: null };

export function useSynthesis() {
    const [state, dispatch] = useReducer(synthesisReducer, INITIAL_STATE);
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const { getKBContext } = useKnowledgeBankContext();
    const canSynthesize = selectedNodeIds.size >= 2;

    const synthesize = useCallback(async (mode: SynthesisMode) => {
        dispatch({ type: 'START' });
        try {
            await executeSynthesis(mode, workspaceId ?? '', getKBContext);
            dispatch({ type: 'COMPLETE' });
        } catch (err) {
            captureError(err, { context: 'synthesis' });
            dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : synthesisStrings.labels.generating });
        }
    }, [workspaceId, getKBContext]);

    const reSynthesize = useCallback(async (nodeId: string, mode?: SynthesisMode) => {
        dispatch({ type: 'START' });
        try {
            await executeReSynthesis(nodeId, mode, getKBContext);
            dispatch({ type: 'COMPLETE' });
        } catch (err) {
            captureError(err, { context: 'reSynthesis' });
            dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : synthesisStrings.labels.generating });
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
