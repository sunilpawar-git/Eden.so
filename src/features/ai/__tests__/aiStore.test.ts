/**
 * AI Store Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../stores/aiStore';

describe('AIStore', () => {
    beforeEach(() => {
        useAIStore.setState({
            isGenerating: false,
            error: null,
            generatingNodeId: null,
        });
    });

    describe('initial state', () => {
        it('should start with isGenerating false', () => {
            expect(useAIStore.getState().isGenerating).toBe(false);
        });

        it('should start with no error', () => {
            expect(useAIStore.getState().error).toBeNull();
        });

        it('should start with no generating node', () => {
            expect(useAIStore.getState().generatingNodeId).toBeNull();
        });
    });

    describe('startGeneration', () => {
        it('should set isGenerating true and store nodeId', () => {
            useAIStore.getState().startGeneration('node-1');

            const state = useAIStore.getState();
            expect(state.isGenerating).toBe(true);
            expect(state.generatingNodeId).toBe('node-1');
            expect(state.error).toBeNull();
        });
    });

    describe('completeGeneration', () => {
        it('should reset generation state', () => {
            useAIStore.setState({ isGenerating: true, generatingNodeId: 'node-1' });
            useAIStore.getState().completeGeneration();

            const state = useAIStore.getState();
            expect(state.isGenerating).toBe(false);
            expect(state.generatingNodeId).toBeNull();
        });
    });

    describe('setError', () => {
        it('should set error and stop generation', () => {
            useAIStore.setState({ isGenerating: true });
            useAIStore.getState().setError('API failed');

            const state = useAIStore.getState();
            expect(state.error).toBe('API failed');
            expect(state.isGenerating).toBe(false);
        });
    });

    describe('clearError', () => {
        it('should clear error message', () => {
            useAIStore.setState({ error: 'Previous error' });
            useAIStore.getState().clearError();

            expect(useAIStore.getState().error).toBeNull();
        });
    });
});
