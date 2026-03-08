/** Export dialog reducer — manages polish state for the export preview flow. */

export interface ExportState {
    readonly isPolishing: boolean;
    readonly polishedMarkdown: string | null;
    readonly isPolished: boolean;
}

export type ExportAction =
    | { type: 'POLISH_START' }
    | { type: 'POLISH_COMPLETE'; markdown: string }
    | { type: 'POLISH_ERROR' }
    | { type: 'TOGGLE_RAW' };

export const INITIAL_STATE: ExportState = { isPolishing: false, polishedMarkdown: null, isPolished: false };

export function exportReducer(state: ExportState, action: ExportAction): ExportState {
    switch (action.type) {
        case 'POLISH_START':
            return { ...state, isPolishing: true };
        case 'POLISH_COMPLETE':
            return { isPolishing: false, polishedMarkdown: action.markdown, isPolished: true };
        case 'POLISH_ERROR':
            return { ...state, isPolishing: false };
        case 'TOGGLE_RAW':
            return { ...state, isPolished: false };
    }
}
