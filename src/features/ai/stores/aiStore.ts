/**
 * AI Store - ViewModel for AI generation state
 */
import { create } from 'zustand';

interface AIState {
    isGenerating: boolean;
    error: string | null;
    generatingNodeId: string | null;
}

interface AIActions {
    startGeneration: (nodeId: string) => void;
    completeGeneration: () => void;
    setError: (error: string) => void;
    clearError: () => void;
}

type AIStore = AIState & AIActions;

const initialState: AIState = {
    isGenerating: false,
    error: null,
    generatingNodeId: null,
};

export const useAIStore = create<AIStore>()((set) => ({
    ...initialState,

    startGeneration: (nodeId: string) => {
        set({
            isGenerating: true,
            generatingNodeId: nodeId,
            error: null,
        });
    },

    completeGeneration: () => {
        set({
            isGenerating: false,
            generatingNodeId: null,
        });
    },

    setError: (error: string) => {
        set({
            error,
            isGenerating: false,
            generatingNodeId: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },
}));
