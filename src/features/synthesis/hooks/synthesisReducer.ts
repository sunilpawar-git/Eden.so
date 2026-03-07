/** Synthesis hook state reducer — extracted to keep useSynthesis under 75 lines */
import { synthesisStrings } from '../strings/synthesisStrings';

export interface SynthesisState {
    readonly isSynthesizing: boolean;
    readonly error: string | null;
}

export type SynthesisAction =
    | { type: 'START' }
    | { type: 'COMPLETE' }
    | { type: 'ERROR'; error: string };

export function synthesisReducer(_: SynthesisState, action: SynthesisAction): SynthesisState {
    switch (action.type) {
        case 'START': return { isSynthesizing: true, error: null };
        case 'COMPLETE': return { isSynthesizing: false, error: null };
        case 'ERROR': return { isSynthesizing: false, error: action.error };
    }
}

export const MAX_SYNTHESIS_NODES = 50;
export const INITIAL_STATE: SynthesisState = { isSynthesizing: false, error: null };

export function extractErrorMsg(err: unknown): string {
    return err instanceof Error ? err.message : synthesisStrings.labels.synthesisError;
}
