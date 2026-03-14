/**
 * Focus Store - ViewModel for node focus mode state
 * SSOT for which node is currently in focus/expanded view
 * Separate from canvasStore to avoid unnecessary re-renders of canvas subscribers
 */
import { create } from 'zustand';
import { useCanvasStore, getNodeMap } from './canvasStore';
import { isContentModeMindmap } from '../types/contentMode';

interface FocusState {
    focusedNodeId: string | null;
}

interface FocusActions {
    enterFocus: (nodeId: string) => void;
    exitFocus: () => void;
}

type FocusStore = FocusState & FocusActions;

export const useFocusStore = create<FocusStore>()((set) => ({
    focusedNodeId: null,

    enterFocus: (nodeId: string) => set({ focusedNodeId: nodeId }),

    exitFocus: () => set({ focusedNodeId: null }),
}));

/** SSOT helper: enter focus + start editing in one batched call.
 *  Mindmap nodes open in view-only mode (no startEditing) so the
 *  MindmapRenderer is visible instead of the TipTap editor. */
export function enterFocusWithEditing(nodeId: string): void {
    useFocusStore.getState().enterFocus(nodeId);
    const state = useCanvasStore.getState();
    const node = getNodeMap(state.nodes).get(nodeId);
    if (!isContentModeMindmap(node?.data.contentMode)) {
        state.startEditing(nodeId);
    }
}
