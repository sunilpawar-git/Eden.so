/**
 * IdeaCard Editing Tests - TDD Phase 1
 * Tests for save-on-blur and populate-on-edit functionality
 * 
 * These tests are written FIRST (RED phase) before implementation
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

describe('IdeaCard Editing - Phase 1', () => {
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
            
            // Blur without pressing Enter - should still save
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Content that should be saved');
        });

        it('should handle AI prefix on blur save', () => {
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
            fireEvent.change(textarea, { target: { value: '/ai: Generate something' } });
            
            // Blur should save the prompt (but not trigger generation)
            fireEvent.blur(textarea);

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
            // Content should be pre-populated, blur without changes
            fireEvent.blur(textarea);

            // Should not call update if content hasn't changed
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

            // Textarea should be populated with existing content
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

            // Textarea should be populated with the prompt
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

            // Content should be saved on blur
            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Partially modified');
        });
    });

    describe('Edit Mode Transitions', () => {
        it('should exit edit mode on Escape without saving changes', () => {
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
            
            // Press Escape - should cancel without saving
            fireEvent.keyDown(textarea, { key: 'Escape' });

            expect(mockUpdateOutput).not.toHaveBeenCalled();
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

            // After save, should exit edit mode (textarea not visible)
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('Double-Click Edit Pattern - Phase 2', () => {
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
});
