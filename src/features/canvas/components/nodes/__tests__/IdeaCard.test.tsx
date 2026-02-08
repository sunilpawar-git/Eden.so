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
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
        branchFromNode: vi.fn(),
    }),
}));

// TipTap mocks — shared state via singleton in helper module
vi.mock('../../../hooks/useTipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).hookMock()
);
vi.mock('../TipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).componentMock()
);

vi.mock('../../../extensions/slashCommandSuggestion', async () =>
    (await import('./helpers/tipTapTestMock')).extensionMock()
);
vi.mock('../../../hooks/useIdeaCardEditor', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardEditorMock()
);
vi.mock('../../../hooks/useIdeaCardKeyboard', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardKeyboardMock()
);

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

    beforeEach(async () => {
        vi.clearAllMocks();
        const { resetMockState } = await import('./helpers/tipTapTestMock');
        resetMockState();
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
            expect(screen.getByTestId('view-editor')).toBeInTheDocument();
        });

        it('renders editor when no output (empty card)', () => {
            const propsNoOutput = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...propsNoOutput} />);
            // Empty cards start in edit mode with TipTap editor
            expect(screen.getByRole('textbox')).toBeInTheDocument();
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
        it('renders Transform button for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.getByRole('button', { name: /transform/i })).toBeInTheDocument();
        });

        it('renders Tags button for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.getByRole('button', { name: /tags/i })).toBeInTheDocument();
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
            expect(screen.getByRole('button', { name: /tags/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /transform/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
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

    // Typography tests are in IdeaCard.style.test.tsx

    // Connection handles tests are in IdeaCard.features.test.tsx

    describe('Editable content area', () => {
        it('double-clicking card content enters edit mode', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My note' },
            };
            render(<IdeaCard {...noteCard} />);
            // Double-click the content to edit
            const content = screen.getByText('My note');
            fireEvent.doubleClick(content);

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

        it('Shift+Enter does not trigger save (TipTap handles newline)', () => {
            const emptyCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...emptyCard} />);

            // Editor is present in edit mode
            expect(screen.getByRole('textbox')).toBeInTheDocument();
            // Shift+Enter is handled by TipTap natively (inserts newline)
            // generateFromPrompt should not be called
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

        it('pressing a printable character key on selected node enters edit mode', () => {
            const noteCard = {
                ...defaultProps,
                selected: true,
                data: { ...defaultData, prompt: '', output: 'My note' },
            };
            render(<IdeaCard {...noteCard} />);

            // Content area should be focusable when selected
            const contentArea = screen.getByTestId('content-area');

            // Press a printable character (h)
            fireEvent.keyDown(contentArea, { key: 'h' });

            // Should enter edit mode and show textarea
            expect(screen.getByRole('textbox')).toBeInTheDocument();
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
