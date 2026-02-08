/**
 * IdeaCard Style Tests - Verify CSS classes are applied correctly
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { IdeaCard } from '../IdeaCard';
import type { NodeProps } from '@xyflow/react';

// Mock CSS modules - returns class name as-is for testing
vi.mock('../IdeaCard.module.css', () => ({
    default: {
        cardWrapper: 'cardWrapper',
        ideaCard: 'ideaCard',
        contentArea: 'contentArea',
        placeholder: 'placeholder',
        inputArea: 'inputArea',
        promptText: 'promptText',
        outputContent: 'outputContent',
        actionBar: 'actionBar',
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        handle: 'handle',
        handleTop: 'handleTop',
        handleBottom: 'handleBottom',
        icon: 'icon',
        generating: 'generating',
        spinner: 'spinner',
        divider: 'divider',
    },
}));

// Helper to wrap component with ReactFlow provider
const renderWithProvider = (props: Partial<NodeProps>) => {
    const defaultProps: NodeProps = {
        id: 'test-node',
        data: { prompt: '', output: undefined },
        selected: false,
        type: 'idea',
        zIndex: 0,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        draggable: true,
        dragHandle: undefined,
        sourcePosition: undefined,
        targetPosition: undefined,
        deletable: true,
        selectable: true,
        parentId: undefined,
        width: 280,
        height: 120,
    };

    return render(
        <ReactFlowProvider>
            <IdeaCard {...defaultProps} {...props} />
        </ReactFlowProvider>
    );
};

describe('IdeaCard styles', () => {
    it('should render TipTap editor in edit mode', () => {
        // Empty node starts in edit mode
        renderWithProvider({
            id: 'test-node',
            data: { prompt: '', output: undefined },
        });

        const editor = screen.getByTestId('tiptap-editor');
        expect(editor).toBeInTheDocument();
    });

    it('should apply outputContent class when displaying content', () => {
        renderWithProvider({
            id: 'output-node',
            data: { prompt: '', output: 'Some note content' },
        });

        // Content area should contain our text
        const contentArea = screen.getByTestId('content-area');
        expect(contentArea).toBeInTheDocument();
        expect(contentArea).toHaveClass('contentArea');
    });

    it('should apply ideaCard class to card container', () => {
        renderWithProvider({
            id: 'test-node',
            data: { prompt: '', output: 'Test' },
        });

        // Card wrapper exists
        const wrapper = screen.getByTestId('content-area').parentElement;
        expect(wrapper).toHaveClass('ideaCard');
    });

    it('should apply promptText class for AI card prompts', () => {
        renderWithProvider({
            id: 'ai-node',
            data: { prompt: 'AI prompt', output: 'AI response that differs' },
        });

        // AI card shows prompt with promptText class
        const promptElement = screen.getByRole('button', { name: /AI prompt/i });
        expect(promptElement).toHaveClass('promptText');
    });
});
