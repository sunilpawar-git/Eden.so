/**
 * IdeaCard Component Tests - TDD: Write tests FIRST
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
        Handle: ({ type, position, isConnectable, className }: { 
            type: string; 
            position: string; 
            isConnectable?: boolean;
            className?: string;
        }) => (
            <div 
                data-testid={`handle-${type}-${position}`}
                data-connectable={isConnectable}
                className={className}
            />
        ),
        Position: {
            Top: 'top',
            Bottom: 'bottom',
        },
        NodeResizer: ({ isVisible }: { isVisible?: boolean }) => (
            <div data-testid="node-resizer" data-visible={isVisible} />
        ),
    };
});

// Mock the generation hook
const mockGenerateFromPrompt = vi.fn();
const mockBranchFromNode = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
        branchFromNode: mockBranchFromNode,
    }),
}));

// Mock MarkdownRenderer for testing
vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
        <div data-testid="markdown-renderer" className={className}>
            {content}
        </div>
    ),
}));

describe('IdeaCard', () => {
    const defaultData: IdeaNodeData = {
        prompt: 'Test prompt content',
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

    describe('Structure', () => {
        it('renders prompt in header', () => {
            render(<IdeaCard {...defaultProps} />);
            // Prompt text appears in header only (no duplicate)
            expect(screen.getByText('Test prompt content')).toBeInTheDocument();
        });

        it('renders output section when output exists', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'AI generated output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            expect(screen.getByText('AI generated output')).toBeInTheDocument();
        });

        it('renders placeholder when no output', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByText(/Enter a prompt/)).toBeInTheDocument();
        });

        it('renders action bar with Regenerate button', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
        });

        it('renders action bar with Branch button', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            expect(screen.getByRole('button', { name: /branch/i })).toBeInTheDocument();
        });

        it('renders action bar with Delete button', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('renders top handle for target connections', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
        });

        it('renders bottom handle for source connections', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
        });
    });

    // Connection handles tests are in IdeaCard.features.test.tsx

    describe('Editable header', () => {
        it('clicking header enters edit mode', () => {
            render(<IdeaCard {...defaultProps} />);
            // Click the header text to edit
            const headerText = screen.getByText('Test prompt content');
            fireEvent.click(headerText);

            // Should now show a textarea
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('Enter key triggers generation when prompt has content', async () => {
            render(<IdeaCard {...defaultProps} />);
            
            // Enter edit mode via header click
            const headerText = screen.getByText('Test prompt content');
            fireEvent.click(headerText);
            const textarea = screen.getByRole('textbox');
            
            // Press Enter
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockGenerateFromPrompt).toHaveBeenCalledWith('idea-1');
        });

        it('Shift+Enter does not trigger generation (allows newline)', () => {
            render(<IdeaCard {...defaultProps} />);
            
            const headerText = screen.getByText('Test prompt content');
            fireEvent.click(headerText);
            const textarea = screen.getByRole('textbox');
            
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });

        it('does not enter edit mode when generating', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            const headerText = screen.getByText('Test prompt content');
            fireEvent.click(headerText);
            
            // Should not enter edit mode (no textarea)
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    // Scrollable output tests are in IdeaCard.features.test.tsx

    describe('Loading state', () => {
        it('shows generating indicator when isGenerating is true', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });
    });

    // Resizable tests are in IdeaCard.features.test.tsx

    describe('Delete action', () => {
        it('clicking delete button calls deleteNode', () => {
            const mockDelete = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                deleteNode: mockDelete,
            });

            render(<IdeaCard {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /delete/i }));

            expect(mockDelete).toHaveBeenCalledWith('idea-1');
        });
    });
});
