/**
 * IdeaCard Dual-Mode Input Tests - Second Brain Feature
 * Tests for /ai: prefix detection (AI mode vs Note mode)
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

    describe('Note Mode (no /ai: prefix)', () => {
        it('saves text directly to output when no /ai: prefix', async () => {
            const mockUpdateOutput = vi.fn();
            const mockUpdatePrompt = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: mockUpdatePrompt,
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

            // Note mode: should ONLY update output, NOT prompt
            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Meeting notes');
            expect(mockUpdatePrompt).not.toHaveBeenCalled();
        });
    });

    describe('AI Mode (/ai: prefix)', () => {
        it('triggers AI generation when /ai: prefix is used', async () => {
            const mockUpdatePrompt = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: mockUpdatePrompt,
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/ai: What is the iPhone paradox?' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockGenerateFromPrompt).toHaveBeenCalledWith('idea-1');
        });

        it('strips /ai: prefix from prompt before storing', async () => {
            const mockUpdatePrompt = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: mockUpdatePrompt,
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/ai: What is quantum computing?' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdatePrompt).toHaveBeenCalledWith('idea-1', 'What is quantum computing?');
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

        it('handles /ai: prefix with only whitespace after it', async () => {
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: '/ai:    ' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });

        it('treats /ai without colon as note mode', async () => {
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
            fireEvent.change(textarea, { target: { value: '/ai without colon' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            // Should be treated as note, not AI
            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', '/ai without colon');
            expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
        });
    });
});
