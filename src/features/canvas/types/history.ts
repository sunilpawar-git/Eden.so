/**
 * History Types — Canvas undo/redo command definitions.
 * Zero runtime — types and constants only.
 */

export const MAX_HISTORY_DEPTH = 50;

export type CanvasCommandType =
    | 'addNode'
    | 'deleteNode'
    | 'batchDelete'
    | 'moveNode'
    | 'addEdge'
    | 'deleteEdge'
    | 'changeColor'
    | 'transformContent';

export interface CanvasCommand {
    readonly type: CanvasCommandType;
    readonly timestamp: number;
    readonly entityId?: string; // For coalescing rapid sequential actions (e.g. color scrubbing)
    readonly undo: () => void;
    readonly redo: () => void;
}

export type HistoryAction =
    | { type: 'PUSH'; command: CanvasCommand }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'CLEAR' };

export interface HistoryState {
    readonly undoStack: readonly CanvasCommand[];
    readonly redoStack: readonly CanvasCommand[];
}

export const INITIAL_HISTORY_STATE: HistoryState = {
    undoStack: [],
    redoStack: [],
};
