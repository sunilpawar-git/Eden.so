/**
 * Tests for historyStore — Zustand integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHistoryStore } from '../historyStore';
import type { CanvasCommand } from '../../types/history';

// Mock toast + analytics so we can assert they're called
const mockToastInfo = vi.fn();
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: (...args: unknown[]) => mockToastInfo(...args), error: vi.fn(), success: vi.fn() },
}));

const mockTrackUndo = vi.fn();
const mockTrackRedo = vi.fn();
vi.mock('@/shared/services/analyticsService', () => ({
    trackCanvasUndo: (...args: unknown[]) => mockTrackUndo(...args),
    trackCanvasRedo: (...args: unknown[]) => mockTrackRedo(...args),
}));

function createCommand(overrides?: Partial<CanvasCommand>): CanvasCommand {
    return {
        type: 'deleteNode',
        timestamp: Date.now(),
        undo: vi.fn(),
        redo: vi.fn(),
        ...overrides,
    };
}

describe('historyStore', () => {
    beforeEach(() => {
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
        vi.clearAllMocks();
    });

    it('dispatch(PUSH) updates undoStack in store', () => {
        const cmd = createCommand();
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    });

    it('dispatch(UNDO) moves command from undo to redo', () => {
        const cmd = createCommand();
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        expect(useHistoryStore.getState().undoStack).toHaveLength(0);
        expect(useHistoryStore.getState().redoStack).toHaveLength(1);
    });

    it('dispatch(UNDO) calls cmd.undo() side effect in dispatch, not reducer', () => {
        const undoFn = vi.fn();
        const cmd = createCommand({ undo: undoFn });
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        expect(undoFn).toHaveBeenCalledOnce();
    });

    it('dispatch(REDO) moves command from redo to undo', () => {
        const cmd = createCommand();
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        useHistoryStore.getState().dispatch({ type: 'REDO' });

        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
        expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it('dispatch(REDO) calls cmd.redo() side effect in dispatch, not reducer', () => {
        const redoFn = vi.fn();
        const cmd = createCommand({ redo: redoFn });
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        useHistoryStore.getState().dispatch({ type: 'REDO' });

        expect(redoFn).toHaveBeenCalledOnce();
    });

    it('dispatch(CLEAR) resets both stacks', () => {
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: createCommand() });
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });

        expect(useHistoryStore.getState().undoStack).toHaveLength(0);
        expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it('selector canUndo returns correct value', () => {
        const canUndo = (s: typeof useHistoryStore extends { getState: () => infer S } ? S : never) =>
            s.undoStack.length > 0;

        expect(canUndo(useHistoryStore.getState())).toBe(false);
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: createCommand() });
        expect(canUndo(useHistoryStore.getState())).toBe(true);
    });

    it('selector canRedo returns correct value', () => {
        const canRedo = (s: typeof useHistoryStore extends { getState: () => infer S } ? S : never) =>
            s.redoStack.length > 0;

        expect(canRedo(useHistoryStore.getState())).toBe(false);
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: createCommand() });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        expect(canRedo(useHistoryStore.getState())).toBe(true);
    });

    describe('analytics tracking', () => {
        it('UNDO dispatches trackCanvasUndo with command type', () => {
            const cmd = createCommand({ type: 'moveNode' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });

            expect(mockTrackUndo).toHaveBeenCalledOnce();
            expect(mockTrackUndo).toHaveBeenCalledWith('moveNode');
        });

        it('REDO dispatches trackCanvasRedo with command type', () => {
            const cmd = createCommand({ type: 'addNode' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });
            useHistoryStore.getState().dispatch({ type: 'REDO' });

            expect(mockTrackRedo).toHaveBeenCalledOnce();
            expect(mockTrackRedo).toHaveBeenCalledWith('addNode');
        });
    });

    describe('toast feedback', () => {
        it('shows toast on UNDO for deleteNode (destructive)', () => {
            const cmd = createCommand({ type: 'deleteNode' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });

            expect(mockToastInfo).toHaveBeenCalledOnce();
        });

        it('shows toast on UNDO for batchDelete (destructive)', () => {
            const cmd = createCommand({ type: 'batchDelete' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });

            expect(mockToastInfo).toHaveBeenCalledOnce();
        });

        it('does NOT show toast on UNDO for moveNode (non-destructive)', () => {
            const cmd = createCommand({ type: 'moveNode' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });

            expect(mockToastInfo).not.toHaveBeenCalled();
        });

        it('does NOT show toast on REDO', () => {
            const cmd = createCommand({ type: 'deleteNode' });
            useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
            useHistoryStore.getState().dispatch({ type: 'UNDO' });
            mockToastInfo.mockClear();

            useHistoryStore.getState().dispatch({ type: 'REDO' });
            expect(mockToastInfo).not.toHaveBeenCalled();
        });
    });
});
