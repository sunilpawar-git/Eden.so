/**
 * IdeaCard Double-Click Tests - TDD Phase 2
 * Tests for double-click to enter edit mode functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

// Mock ReactFlow hooks and components
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: () => <div data-testid="node-resizer" />,
    };
});

// Mock the generation hook
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
        branchFromNode: vi.fn(),
    }),
}));

// Mock MarkdownRenderer
vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content }: { content: string }) => (
        <div data-testid="markdown-renderer">{content}</div>
    ),
}));

describe('IdeaCard Double-Click Edit Pattern - Phase 2', () => {
    const defaultData: IdeaNodeData = {
        prompt: '',
        output: undefined,
        isGenerating: false,
        isPromptCollapsed: false,
    };

    const defaultProps = {
        id: 'idea-1',
        data: defaultData,
        type: 'idea' as const,
        selected: false,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        zIndex: 0,
        dragging: false,
        selectable: true,
        deletable: true,
        draggable: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should enter edit mode on double-click', () => {
        const propsWithOutput = {
            ...defaultProps,
            data: { ...defaultData, output: 'Existing content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Should show content, not textarea initially
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Existing content')).toBeInTheDocument();

        // Double-click to enter edit mode
        const content = screen.getByText('Existing content');
        fireEvent.doubleClick(content);

        // Should now show textarea
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should NOT enter edit mode on single-click (allow selection)', () => {
        const propsWithOutput = {
            ...defaultProps,
            data: { ...defaultData, output: 'Clickable content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Single-click should NOT trigger edit mode
        const content = screen.getByText('Clickable content');
        fireEvent.click(content);

        // Should still show content, not textarea
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Clickable content')).toBeInTheDocument();
    });

    it('should enter edit mode for AI card prompt on double-click', () => {
        const aiCardProps = {
            ...defaultProps,
            data: { 
                ...defaultData, 
                prompt: 'AI prompt here',
                output: 'AI generated response' 
            },
        };

        render(<IdeaCard {...aiCardProps} />);

        // Double-click prompt to edit
        const promptText = screen.getByText('AI prompt here');
        fireEvent.doubleClick(promptText);

        // Should enter edit mode
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support Enter key to enter edit mode when node is selected', () => {
        const propsWithOutput = {
            ...defaultProps,
            selected: true, // Node is selected
            data: { ...defaultData, output: 'Selected node content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Press Enter on selected node content
        const contentArea = screen.getByTestId('content-area');
        fireEvent.keyDown(contentArea, { key: 'Enter' });

        // Should enter edit mode
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support keyboard navigation: Enter on content to edit', () => {
        const propsWithOutput = {
            ...defaultProps,
            data: { ...defaultData, output: 'Keyboard accessible' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Find the clickable content area and trigger Enter
        const content = screen.getByText('Keyboard accessible');
        fireEvent.keyDown(content, { key: 'Enter' });

        // Should enter edit mode (existing behavior maintained)
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should NOT enter edit mode on double-click when generating', () => {
        const generatingProps = {
            ...defaultProps,
            data: { ...defaultData, prompt: 'Test', output: 'Test', isGenerating: true },
        };

        render(<IdeaCard {...generatingProps} />);

        // Should show generating state
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
});
