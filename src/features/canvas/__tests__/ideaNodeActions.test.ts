/**
 * IdeaNode Store Actions Tests - TDD for unified IdeaCard functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasNode, IdeaNodeData } from '../types/node';
import { createIdeaNode } from '../types/node';

describe('IdeaNode actions', () => {
    const mockIdeaNodeData: IdeaNodeData = {
        prompt: 'Test prompt',
        output: undefined,
        isGenerating: false,
        isPromptCollapsed: false,
    };

    const mockIdeaNode: CanvasNode = {
        id: 'idea-1',
        workspaceId: 'workspace-1',
        type: 'idea',
        data: mockIdeaNodeData,
        position: { x: 100, y: 200 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    describe('createIdeaNode factory', () => {
        it('creates node with idea type', () => {
            const node = createIdeaNode('idea-test', 'workspace-1', { x: 50, y: 100 }, 'My prompt');

            expect(node.type).toBe('idea');
            expect(node.id).toBe('idea-test');
            expect(node.workspaceId).toBe('workspace-1');
            expect(node.position).toEqual({ x: 50, y: 100 });
            expect((node.data as IdeaNodeData).prompt).toBe('My prompt');
            expect((node.data as IdeaNodeData).output).toBeUndefined();
            expect((node.data as IdeaNodeData).isGenerating).toBe(false);
            expect((node.data as IdeaNodeData).isPromptCollapsed).toBe(false);
        });

        it('creates node with empty prompt by default', () => {
            const node = createIdeaNode('idea-test', 'workspace-1', { x: 0, y: 0 });
            expect((node.data as IdeaNodeData).prompt).toBe('');
        });
    });

    describe('updateNodeOutput', () => {
        it('updates output field', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().updateNodeOutput('idea-1', 'Generated AI output');

            const node = useCanvasStore.getState().nodes[0];
            expect((node?.data as IdeaNodeData).output).toBe('Generated AI output');
        });

        it('does not affect other node fields', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().updateNodeOutput('idea-1', 'New output');

            const node = useCanvasStore.getState().nodes[0];
            expect((node?.data as IdeaNodeData).prompt).toBe('Test prompt');
            expect((node?.data as IdeaNodeData).isGenerating).toBe(false);
        });
    });

    describe('setNodeGenerating', () => {
        it('sets isGenerating flag to true', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().setNodeGenerating('idea-1', true);

            const node = useCanvasStore.getState().nodes[0];
            expect((node?.data as IdeaNodeData).isGenerating).toBe(true);
        });

        it('sets isGenerating flag to false', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().setNodeGenerating('idea-1', true);
            useCanvasStore.getState().setNodeGenerating('idea-1', false);

            const node = useCanvasStore.getState().nodes[0];
            expect((node?.data as IdeaNodeData).isGenerating).toBe(false);
        });
    });

    describe('togglePromptCollapsed', () => {
        it('toggles collapsed state from false to true', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);

            // Initially not collapsed
            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).isPromptCollapsed).toBe(false);

            // Toggle to collapsed
            useCanvasStore.getState().togglePromptCollapsed('idea-1');
            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).isPromptCollapsed).toBe(true);
        });

        it('toggles collapsed state from true to false', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().togglePromptCollapsed('idea-1'); // false -> true
            useCanvasStore.getState().togglePromptCollapsed('idea-1'); // true -> false

            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).isPromptCollapsed).toBe(false);
        });
    });

    describe('appendToNodeOutput', () => {
        it('appends chunk to existing output', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);
            useCanvasStore.getState().updateNodeOutput('idea-1', 'Hello ');
            useCanvasStore.getState().appendToNodeOutput('idea-1', 'World!');

            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).output).toBe('Hello World!');
        });

        it('creates output if undefined', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);

            // Output starts undefined
            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).output).toBeUndefined();

            // Append creates the output
            useCanvasStore.getState().appendToNodeOutput('idea-1', 'First chunk');
            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).output).toBe('First chunk');
        });

        it('handles multiple sequential appends for streaming', () => {
            useCanvasStore.getState().addNode(mockIdeaNode);

            useCanvasStore.getState().appendToNodeOutput('idea-1', 'The ');
            useCanvasStore.getState().appendToNodeOutput('idea-1', 'quick ');
            useCanvasStore.getState().appendToNodeOutput('idea-1', 'brown ');
            useCanvasStore.getState().appendToNodeOutput('idea-1', 'fox');

            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).output).toBe('The quick brown fox');
        });
    });
});
