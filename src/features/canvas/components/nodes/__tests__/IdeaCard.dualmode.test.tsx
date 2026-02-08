/**
 * IdeaCard Dual-Mode Input Tests
 * Tests for note mode saving and edge cases.
 * Slash command popup behavior is tested in SlashCommandList.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { defaultTestProps } from './helpers/ideaCardTestMocks';

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

describe('IdeaCard Dual-Mode Input', () => {
    const defaultProps = defaultTestProps;

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

    describe('Note Mode (default)', () => {
        it('saves text directly to output in note mode', () => {
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

        it('does NOT update prompt for note mode (only output)', () => {
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

    describe('Edge cases', () => {
        it('does not trigger anything for empty input', () => {
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

        it('treats "/" in middle of text as note mode', () => {
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
