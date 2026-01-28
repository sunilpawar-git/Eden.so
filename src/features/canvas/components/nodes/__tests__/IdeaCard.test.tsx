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
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: {
            Top: 'top',
            Bottom: 'bottom',
        },
        NodeResizer: () => <div data-testid="node-resizer" />,
    };
});

// Mock the generation hook
const mockGenerateFromPrompt = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
    }),
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
        it('renders prompt section with content', () => {
            render(<IdeaCard {...defaultProps} />);
            // Prompt text appears in header (getAllByText returns multiple matches)
            const promptElements = screen.getAllByText('Test prompt content');
            expect(promptElements.length).toBeGreaterThanOrEqual(1);
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

    describe('Collapsible prompt', () => {
        it('prompt is expanded by default', () => {
            render(<IdeaCard {...defaultProps} />);
            // Full prompt text visible (in header and content)
            const promptElements = screen.getAllByText('Test prompt content');
            expect(promptElements.length).toBeGreaterThanOrEqual(1);
        });

        it('shows collapse button when prompt is expanded', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
        });

        it('shows expand button when prompt is collapsed', () => {
            const collapsedProps = {
                ...defaultProps,
                data: { ...defaultData, isPromptCollapsed: true },
            };
            render(<IdeaCard {...collapsedProps} />);
            expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
        });

        it('clicking collapse button calls togglePromptCollapsed', () => {
            const mockToggle = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                togglePromptCollapsed: mockToggle,
            });

            render(<IdeaCard {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /collapse/i }));

            expect(mockToggle).toHaveBeenCalledWith('idea-1');
        });
    });

    describe('Scrollable output', () => {
        it('output section has scrollable styling', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output content' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const outputSection = screen.getByTestId('output-section');
            // CSS modules mangle class names, check for partial match
            expect(outputSection.className).toContain('outputSection');
        });
    });

    describe('Interactions', () => {
        it('clicking prompt content enters edit mode', () => {
            render(<IdeaCard {...defaultProps} />);
            // Click the prompt content (role="button") not the header
            const promptContent = screen.getByRole('button', { name: 'Test prompt content' });
            fireEvent.click(promptContent);

            // Should now show a textarea
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('Enter key triggers generation when prompt has content', async () => {
            render(<IdeaCard {...defaultProps} />);
            
            // Enter edit mode via prompt content
            const promptContent = screen.getByRole('button', { name: 'Test prompt content' });
            fireEvent.click(promptContent);
            const textarea = screen.getByRole('textbox');
            
            // Press Enter
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockGenerateFromPrompt).toHaveBeenCalledWith('idea-1');
        });

        it('Shift+Enter does not trigger generation (allows newline)', () => {
            render(<IdeaCard {...defaultProps} />);
            
            const promptContent = screen.getByRole('button', { name: 'Test prompt content' });
            fireEvent.click(promptContent);
            const textarea = screen.getByRole('textbox');
            
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });
    });

    describe('Loading state', () => {
        it('shows generating indicator when isGenerating is true', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });

        it('disables prompt editing when generating', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);
            
            // Prompt content should not be clickable for edit when generating
            const promptContent = screen.getByRole('button', { name: 'Test prompt content' });
            fireEvent.click(promptContent);
            
            // Should not enter edit mode (no textarea)
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('Resizable', () => {
        it('renders NodeResizer component', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('node-resizer')).toBeInTheDocument();
        });
    });

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
