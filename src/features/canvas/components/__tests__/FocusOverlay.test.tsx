/**
 * FocusOverlay Tests - TDD: RED phase first
 * Tests for the focus mode overlay panel
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusOverlay } from '../FocusOverlay';
import { useFocusStore } from '../../stores/focusStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import type { CanvasNode } from '../../types/node';

vi.mock('../../hooks/useIdeaCardEditor', () => ({
    useIdeaCardEditor: () => ({
        editor: null,
        getMarkdown: vi.fn(() => ''),
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
        NodeHeading: React.forwardRef(({ heading }: { heading: string }, _ref: unknown) => (
            React.createElement('div', { 'data-testid': 'focus-heading' }, heading)
        )),
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

describe('FocusOverlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useFocusStore.setState({ focusedNodeId: null });
        useCanvasStore.setState({
            nodes: [mockNode],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
        useSidebarStore.setState({ isPinned: false, isHoverOpen: false });
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
        expect(screen.getByTestId('focus-close-button')).toHaveAttribute('aria-label', 'Exit focus');
    });

    it('has correct ARIA attributes', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', 'Focus');
    });

    it('does not render when focused node does not exist', () => {
        useFocusStore.setState({ focusedNodeId: 'non-existent' });
        render(<FocusOverlay />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
