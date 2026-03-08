/**
 * Tests for historyReducer — Pure function, no React/Zustand needed
 */
import { describe, it, expect, vi } from 'vitest';
import { historyReducer } from '../historyReducer';
import {
    INITIAL_HISTORY_STATE,
    MAX_HISTORY_DEPTH,
    type CanvasCommand,
    type HistoryState,
} from '../../types/history';

function createCommand(overrides?: Partial<CanvasCommand>): CanvasCommand {
    return {
        type: 'deleteNode',
        timestamp: 1000,
        undo: vi.fn(),
        redo: vi.fn(),
        ...overrides,
    };
}

describe('historyReducer', () => {
    describe('PUSH', () => {
        it('adds command to undoStack', () => {
            const cmd = createCommand();
            const result = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd });
            expect(result.undoStack).toHaveLength(1);
            expect(result.undoStack[0]).toBe(cmd);
        });

        it('clears redoStack', () => {
            const state: HistoryState = {
                undoStack: [],
                redoStack: [createCommand()],
            };
            const result = historyReducer(state, { type: 'PUSH', command: createCommand() });
            expect(result.redoStack).toHaveLength(0);
        });

        it('coalesces rapid same-entity same-type commands within 1000ms', () => {
            const undo1 = vi.fn();
            const redo1 = vi.fn();
            const redo2 = vi.fn();
            const cmd1 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1000, undo: undo1, redo: redo1 });
            const cmd2 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1500, redo: redo2 });

            let state = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd1 });
            state = historyReducer(state, { type: 'PUSH', command: cmd2 });

            expect(state.undoStack).toHaveLength(1);
            expect(state.undoStack[0]!.undo).toBe(undo1); // original undo preserved
            expect(state.undoStack[0]!.redo).toBe(redo2); // redo updated to latest
        });

        it('does NOT coalesce different entity IDs', () => {
            const cmd1 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1000 });
            const cmd2 = createCommand({ entityId: 'n2', type: 'changeColor', timestamp: 1500 });

            let state = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd1 });
            state = historyReducer(state, { type: 'PUSH', command: cmd2 });

            expect(state.undoStack).toHaveLength(2);
        });

        it('does NOT coalesce different command types', () => {
            const cmd1 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1000 });
            const cmd2 = createCommand({ entityId: 'n1', type: 'moveNode', timestamp: 1500 });

            let state = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd1 });
            state = historyReducer(state, { type: 'PUSH', command: cmd2 });

            expect(state.undoStack).toHaveLength(2);
        });

        it('does NOT coalesce if > 1000ms apart', () => {
            const cmd1 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1000 });
            const cmd2 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 2001 });

            let state = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd1 });
            state = historyReducer(state, { type: 'PUSH', command: cmd2 });

            expect(state.undoStack).toHaveLength(2);
        });

        it('coalescing preserves original undo and updates redo', () => {
            const originalUndo = vi.fn();
            const latestRedo = vi.fn();
            const cmd1 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1000, undo: originalUndo });
            const cmd2 = createCommand({ entityId: 'n1', type: 'changeColor', timestamp: 1500, redo: latestRedo });

            let state = historyReducer(INITIAL_HISTORY_STATE, { type: 'PUSH', command: cmd1 });
            state = historyReducer(state, { type: 'PUSH', command: cmd2 });

            expect(state.undoStack[0]!.undo).toBe(originalUndo);
            expect(state.undoStack[0]!.redo).toBe(latestRedo);
            expect(state.undoStack[0]!.timestamp).toBe(1500);
        });

        it('respects MAX_HISTORY_DEPTH — oldest discarded', () => {
            let state = INITIAL_HISTORY_STATE;
            for (let i = 0; i < MAX_HISTORY_DEPTH + 5; i++) {
                state = historyReducer(state, {
                    type: 'PUSH',
                    command: createCommand({ timestamp: i * 2000 }),
                });
            }
            expect(state.undoStack).toHaveLength(MAX_HISTORY_DEPTH);
        });
    });

    describe('UNDO', () => {
        it('pops from undoStack and pushes to redoStack', () => {
            const cmd = createCommand();
            const state: HistoryState = { undoStack: [cmd], redoStack: [] };
            const result = historyReducer(state, { type: 'UNDO' });

            expect(result.undoStack).toHaveLength(0);
            expect(result.redoStack).toHaveLength(1);
            expect(result.redoStack[0]).toBe(cmd);
        });

        it('does NOT call cmd.undo() — side effects live in store dispatch', () => {
            const undoFn = vi.fn();
            const cmd = createCommand({ undo: undoFn });
            const state: HistoryState = { undoStack: [cmd], redoStack: [] };

            historyReducer(state, { type: 'UNDO' });

            expect(undoFn).not.toHaveBeenCalled();
        });

        it('on empty stack returns same state (referential equality)', () => {
            const result = historyReducer(INITIAL_HISTORY_STATE, { type: 'UNDO' });
            expect(result).toBe(INITIAL_HISTORY_STATE);
        });
    });

    describe('REDO', () => {
        it('pops from redoStack and pushes to undoStack', () => {
            const cmd = createCommand();
            const state: HistoryState = { undoStack: [], redoStack: [cmd] };
            const result = historyReducer(state, { type: 'REDO' });

            expect(result.redoStack).toHaveLength(0);
            expect(result.undoStack).toHaveLength(1);
            expect(result.undoStack[0]).toBe(cmd);
        });

        it('does NOT call cmd.redo() — side effects live in store dispatch', () => {
            const redoFn = vi.fn();
            const cmd = createCommand({ redo: redoFn });
            const state: HistoryState = { undoStack: [], redoStack: [cmd] };

            historyReducer(state, { type: 'REDO' });

            expect(redoFn).not.toHaveBeenCalled();
        });

        it('on empty stack returns same state (referential equality)', () => {
            const result = historyReducer(INITIAL_HISTORY_STATE, { type: 'REDO' });
            expect(result).toBe(INITIAL_HISTORY_STATE);
        });
    });

    describe('CLEAR', () => {
        it('returns INITIAL_HISTORY_STATE', () => {
            const state: HistoryState = {
                undoStack: [createCommand()],
                redoStack: [createCommand()],
            };
            const result = historyReducer(state, { type: 'CLEAR' });
            expect(result).toBe(INITIAL_HISTORY_STATE);
        });
    });

    describe('unknown action', () => {
        it('returns same state', () => {
            const result = historyReducer(
                INITIAL_HISTORY_STATE,
                { type: 'UNKNOWN' } as unknown as { type: 'CLEAR' },
            );
            expect(result).toBe(INITIAL_HISTORY_STATE);
        });
    });
});
