/**
 * IdeaCard Dual-Mode Input Tests - Slash Command Menu
 * Tests for "/" slash command detection and AI mode switching
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
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

describe('IdeaCard Dual-Mode Input', () => {
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

    describe('Note Mode (default)', () => {
        it('saves text directly to output in note mode', async () => {
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
            fireEvent.change(textarea, { target: { value: 'My personal note' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'My personal note');
            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });

        it('does NOT update prompt for note mode (only output)', async () => {
            const mockUpdatePrompt = vi.fn();
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: mockUpdatePrompt,
                updateNodeOutput: mockUpdateOutput,
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Meeting notes' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Meeting notes');
            expect(mockUpdatePrompt).not.toHaveBeenCalled();
        });
    });

    describe('Slash Command Menu', () => {
        it('opens menu when "/" is typed at start', () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/' } });

            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('shows AI Generate command in menu', () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/' } });

            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('filters menu by query', () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/ai' } });

            expect(screen.getByText(strings.slashCommands.aiGenerate.label)).toBeInTheDocument();
        });

        it('closes menu on Escape', () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/' } });
            expect(screen.getByRole('menu')).toBeInTheDocument();

            fireEvent.keyDown(textarea, { key: 'Escape' });
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });

    describe('AI Mode (after command selection)', () => {
        it('shows prefix pill after selecting AI command', async () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/' } });

            // Select AI Generate command
            const menuItem = screen.getByRole('menuitem');
            fireEvent.click(menuItem);

            await waitFor(() => {
                expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Type your AI prompt...');
            });
        });

        it('triggers AI generation when Enter pressed in AI mode', async () => {
            const mockUpdatePrompt = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: mockUpdatePrompt,
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            
            // Open menu and select AI command
            fireEvent.change(textarea, { target: { value: '/' } });
            const menuItem = screen.getByRole('menuitem');
            fireEvent.click(menuItem);

            // Now in AI mode - type prompt and press Enter
            await waitFor(() => {
                expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Type your AI prompt...');
            });

            // Get textarea again (may have re-rendered)
            const aiTextarea = screen.getByRole('textbox');
            fireEvent.change(aiTextarea, { target: { value: 'What is quantum computing?' } });
            fireEvent.keyDown(aiTextarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdatePrompt).toHaveBeenCalledWith('idea-1', 'What is quantum computing?');
            expect(mockGenerateFromPrompt).toHaveBeenCalledWith('idea-1');
        });

        it('shows AI mode placeholder', async () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/' } });

            const menuItem = screen.getByRole('menuitem');
            fireEvent.click(menuItem);

            await waitFor(() => {
                const aiTextarea = screen.getByRole('textbox');
                expect(aiTextarea).toHaveAttribute('placeholder', strings.ideaCard.aiModePlaceholder);
            });
        });
    });

    describe('Edge cases', () => {
        it('does not trigger anything for empty input', async () => {
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
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).not.toHaveBeenCalled();
            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });

        it('does not open menu when "/" is not at start', async () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'hello /' } });

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });

        it('treats "/" in middle of text as note mode', async () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'path/to/file' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'path/to/file');
            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });
    });
});
