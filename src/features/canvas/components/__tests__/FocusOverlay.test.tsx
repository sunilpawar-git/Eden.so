/**
 * FocusOverlay Tests
 * Covers rendering, interaction, editing, ARIA, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusOverlay } from '../FocusOverlay';
import { useFocusStore } from '../../stores/focusStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode } from '../../types/node';

const mockGetMarkdown = vi.fn(() => 'edited content');

vi.mock('../../hooks/useIdeaCardEditor', () => ({
    useIdeaCardEditor: () => ({
        editor: null,
        getMarkdown: mockGetMarkdown,
        setContent: vi.fn(),
        submitHandlerRef: { current: null },
    }),
}));

vi.mock('../../hooks/useTipTapEditor', () => ({
    useTipTapEditor: () => ({
        editor: null,
        getMarkdown: vi.fn(() => ''),
        setContent: vi.fn(),
    }),
}));

vi.mock('../nodes/NodeHeading', async () => {
    const React = await import('react');
    return {
        NodeHeading: React.forwardRef(
            ({ heading, onDoubleClick }: { heading: string; onDoubleClick?: () => void }, _ref: unknown) => (
                React.createElement('div', { 'data-testid': 'focus-heading', onDoubleClick }, heading)
            ),
        ),
    };
});

vi.mock('../nodes/TipTapEditor', async () => {
    const React = await import('react');
    return {
        TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) =>
            React.createElement('div', { 'data-testid': testId ?? 'tiptap-editor' }),
    };
});

vi.mock('@/features/tags', async () => {
    const React = await import('react');
    return {
        TagInput: ({ selectedTagIds }: { selectedTagIds: string[] }) =>
            React.createElement('div', { 'data-testid': 'focus-tags' }, selectedTagIds.join(',')),
    };
});

vi.mock('../../hooks/useHeadingEditor', () => ({
    useHeadingEditor: () => ({
        editor: null,
        suggestionActiveRef: { current: false },
    }),
}));

const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: {
        heading: 'Test Heading',
        prompt: 'Test prompt',
        output: 'Test output content',
        isGenerating: false,
        isPromptCollapsed: false,
        tags: ['tag-1', 'tag-2'],
    },
    position: { x: 100, y: 200 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockNodeNoTags: CanvasNode = {
    ...mockNode,
    id: 'node-no-tags',
    data: { ...mockNode.data, tags: [], heading: '' },
};

function setCanvasDefaults() {
    useCanvasStore.setState({
        nodes: [mockNode, mockNodeNoTags],
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
}

describe('FocusOverlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useFocusStore.setState({ focusedNodeId: null });
        setCanvasDefaults();
    });

    it('does not render when focusedNodeId is null', () => {
        render(<FocusOverlay />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders backdrop and panel when focused', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('focus-backdrop')).toBeInTheDocument();
        expect(screen.getByTestId('focus-panel')).toBeInTheDocument();
    });

    it('displays node heading from store', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-heading')).toHaveTextContent('Test Heading');
    });

    it('displays tags from store', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-tags')).toHaveTextContent('tag-1,tag-2');
    });

    it('close button calls exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-close-button'));
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('backdrop click calls exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-backdrop'));
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('panel click does NOT call exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-panel'));
        expect(useFocusStore.getState().focusedNodeId).toBe('node-1');
    });

    it('uses string resources for close button label', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-close-button'))
            .toHaveAttribute('aria-label', strings.nodeUtils.exitFocus);
    });

    it('has correct ARIA attributes', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', strings.nodeUtils.focus);
    });

    it('does not render when focused node does not exist', () => {
        useFocusStore.setState({ focusedNodeId: 'non-existent' });
        render(<FocusOverlay />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    describe('Editing', () => {
        it('calls startEditing when overlay mounts with a focused node', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('double-clicking content area calls startEditing', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            fireEvent.doubleClick(screen.getByTestId('focus-content-area'));
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('double-clicking heading calls startEditing', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            fireEvent.doubleClick(screen.getByTestId('focus-heading'));
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });
    });

    describe('Save on exit', () => {
        it('saves content to store when close button is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-close-button'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.output).toBe('edited content');
        });

        it('saves content to store when backdrop is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-backdrop'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.output).toBe('edited content');
        });
    });

    describe('Edge cases', () => {
        it('renders with empty heading', () => {
            useFocusStore.setState({ focusedNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-heading')).toHaveTextContent('');
        });

        it('hides tags section when node has no tags', () => {
            useFocusStore.setState({ focusedNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            expect(screen.queryByTestId('focus-tags')).not.toBeInTheDocument();
        });
    });
});
