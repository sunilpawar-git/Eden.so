/**
 * IdeaCard Key Handler Regression Tests
 * TDD tests for Escape/Enter key behavior - text should NOT vanish
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { defaultTestData, defaultTestProps } from './helpers/ideaCardTestMocks';

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

describe('IdeaCard Key Handler Regression', () => {
    const defaultData = defaultTestData;
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

    describe('Escape Key - Text Preservation (Regression)', () => {
        it('should save content to store when pressing Escape', () => {
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
            fireEvent.change(textarea, { target: { value: 'Content should persist' } });
            fireEvent.keyDown(textarea, { key: 'Escape' });

            // REGRESSION: Previously this was NOT called, causing text to vanish
            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Content should persist');
        });

        it('should save modified content on Escape when editing existing node', () => {
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

            // Enter edit mode
            const content = screen.getByText('Original content');
            fireEvent.doubleClick(content);

            // Modify and Escape
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'Modified content' } });
            fireEvent.keyDown(textarea, { key: 'Escape' });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Modified content');
        });

        it('should not save on Escape if content is unchanged', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Unchanged content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Enter edit mode, don't change, Escape
            const content = screen.getByText('Unchanged content');
            fireEvent.doubleClick(content);

            const textarea = screen.getByRole('textbox');
            fireEvent.keyDown(textarea, { key: 'Escape' });

            expect(mockUpdateOutput).not.toHaveBeenCalled();
        });

        it('should stop event propagation to prevent global handler interference', () => {
            // This test ensures the Escape doesn't bubble to useKeyboardShortcuts
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
            const keyDownEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true,
            });

            const stopPropagationSpy = vi.spyOn(keyDownEvent, 'stopPropagation');
            textarea.dispatchEvent(keyDownEvent);

            // Event propagation should be stopped
            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });

    describe('Enter Key - Race Condition Prevention (Regression)', () => {
        it('should save content and exit edit mode on Enter', async () => {
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
            fireEvent.change(textarea, { target: { value: 'Enter saves this' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Enter saves this');

            // Should exit edit mode
            await waitFor(() => {
                expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            });
        });

        it('should display saved content after Enter (no vanishing)', async () => {
            // This is the core regression test for the race condition
            const mockUpdateOutput = vi.fn();

            // Simulate store update by re-rendering with new data
            const { rerender } = render(<IdeaCard {...defaultProps} />);

            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'This text must not vanish' } });
            fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

            // Simulate the store update propagating back to component
            rerender(<IdeaCard
                {...defaultProps}
                data={{ ...defaultData, output: 'This text must not vanish' }}
            />);

            // Content should be visible in view mode
            await waitFor(() => {
                expect(screen.getByText('This text must not vanish')).toBeInTheDocument();
            });
        });

        it('should stop event propagation on Enter', () => {
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
            fireEvent.change(textarea, { target: { value: 'Test content' } });

            const keyDownEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true,
                cancelable: true,
            });

            const stopPropagationSpy = vi.spyOn(keyDownEvent, 'stopPropagation');
            textarea.dispatchEvent(keyDownEvent);

            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });
});
