/**
 * IdeaCard Editing Tests
 * Tests for save-on-blur and populate-on-edit functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
const mockGenerateFromPrompt = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
        branchFromNode: vi.fn(),
    }),
}));

// Mock MarkdownRenderer
vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content }: { content: string }) => (
        <div data-testid="markdown-renderer">{content}</div>
    ),
}));

describe('IdeaCard Editing', () => {
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

    describe('Save on Blur (Data Loss Prevention)', () => {
        it('should save content to store on blur instead of discarding', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Content that should be saved' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Content that should be saved');
        });

        it('should save AI prompt on blur in AI mode', async () => {
            const mockUpdatePrompt = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: mockUpdatePrompt,
                updateNodeOutput: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');

            // Enter AI mode via slash command
            fireEvent.change(textarea, { target: { value: '/' } });
            const menuItem = screen.getByRole('menuitem');
            fireEvent.click(menuItem);

            // Wait for AI mode (placeholder changes)
            await waitFor(() => {
                expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Type your AI prompt...');
            });

            // Type prompt and blur
            const aiTextarea = screen.getByRole('textbox');
            fireEvent.change(aiTextarea, { target: { value: 'Generate something' } });
            fireEvent.blur(aiTextarea);

            expect(mockUpdatePrompt).toHaveBeenCalledWith('idea-1', 'Generate something');
        });

        it('should not save on blur if content is empty', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '   ' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).not.toHaveBeenCalled();
        });

        it('should not save on blur if content unchanged from existing', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Existing content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Existing content');
            fireEvent.doubleClick(content);

            const textarea = screen.getByRole('textbox');
            fireEvent.blur(textarea);
            expect(mockUpdateOutput).not.toHaveBeenCalled();
        });
    });

    describe('Populate on Edit (Re-editing Support)', () => {
        it('should populate textarea with existing output when entering edit mode', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'My existing note content' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('My existing note content');
            fireEvent.doubleClick(content);

            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveValue('My existing note content');
        });

        it('should populate textarea with prompt for AI cards when entering edit mode', () => {
            const aiCardProps = {
                ...defaultProps,
                data: {
                    ...defaultData,
                    prompt: 'Original AI prompt',
                    output: 'AI generated response'
                },
            };

            render(<IdeaCard {...aiCardProps} />);

            // Double-click prompt area to enter edit mode
            const promptText = screen.getByText('Original AI prompt');
            fireEvent.doubleClick(promptText);

            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveValue('Original AI prompt');
        });

        it('should allow editing and saving modified content', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Original content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Original content');
            fireEvent.doubleClick(content);

            // Modify the content
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Modified content' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Modified content');
        });

        it('should preserve content when clicking outside and back in', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Persistent content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Persistent content');
            fireEvent.doubleClick(content);

            // Modify content partially
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Partially modified' } });

            // Blur (click outside)
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Partially modified');
        });
    });

    describe('Edit Mode Transitions', () => {
        it('should exit edit mode on Escape and save changes (same as blur)', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Some content' } });

            fireEvent.keyDown(textarea, { key: 'Escape' });

            // Escape now saves content to prevent text vanishing bug
            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Some content');
        });

        it('should exit edit mode after successful save on Enter', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Saved content' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });
});
