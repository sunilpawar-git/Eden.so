/**
 * Focus Store - ViewModel for node focus mode state
 * SSOT for which node is currently in focus/expanded view
 * Separate from canvasStore to avoid unnecessary re-renders of canvas subscribers
 */
import { create } from 'zustand';

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
