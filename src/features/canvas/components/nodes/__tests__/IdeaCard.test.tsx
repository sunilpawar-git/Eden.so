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
        it('renders output section when output exists', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'AI generated output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            expect(screen.getByText('AI generated output')).toBeInTheDocument();
        });

        it('renders input textarea with placeholder when no output (empty card)', () => {
            const propsNoOutput = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...propsNoOutput} />);
            // Empty cards start in edit mode with textarea
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveAttribute('placeholder', expect.stringMatching(/Type to save note/));
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

    describe('Unified action bar (all cards get same actions)', () => {
        it('renders Regenerate button for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
        });

        it('renders Branch button for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.getByRole('button', { name: /branch/i })).toBeInTheDocument();
        });

        it('renders Delete button for all cards', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('renders all action buttons for AI cards', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'AI prompt', output: 'AI response' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /branch/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });
    });

    describe('AI card divider (prompt !== output)', () => {
        it('shows divider for AI cards where prompt differs from output', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'Write a poem', output: 'Roses are red...' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByTestId('ai-divider')).toBeInTheDocument();
        });

        it('shows prompt text above divider for AI cards', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'Write a poem', output: 'Roses are red...' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByText('Write a poem')).toBeInTheDocument();
        });

        it('does NOT show divider for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.queryByTestId('ai-divider')).not.toBeInTheDocument();
        });
    });

    // Connection handles tests are in IdeaCard.features.test.tsx

    describe('Editable content area', () => {
        it('clicking card content enters edit mode', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My note' },
            };
            render(<IdeaCard {...noteCard} />);
            // Click the content to edit
            const content = screen.getByText('My note');
            fireEvent.click(content);

            // Should now show a textarea
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('empty card shows input textarea by default', () => {
            const emptyCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...emptyCard} />);
            
            // Empty cards start in edit mode
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('Shift+Enter does not trigger save (allows newline)', () => {
            const emptyCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...emptyCard} />);
            
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Some text' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });

        it('shows generating spinner when isGenerating is true (not content)', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'AI prompt', output: 'Response', isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            // When generating, spinner is shown instead of content
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
            // Content is not visible during generation
            expect(screen.queryByText('AI prompt')).not.toBeInTheDocument();
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

    // Dual-mode input tests are in IdeaCard.dualmode.test.tsx
});
