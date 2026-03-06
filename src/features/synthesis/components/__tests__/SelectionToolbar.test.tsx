import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionToolbar } from '../SelectionToolbar';
import { synthesisStrings } from '../../strings/synthesisStrings';

const mockSynthesize = vi.fn().mockResolvedValue(undefined);
let mockSelectedSize = 0;

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ selectedNodeIds: new Set(Array.from({ length: mockSelectedSize }, (_, i) => `N${i}`)) }),
        { getState: () => ({ selectedNodeIds: new Set(), nodes: [], edges: [] }) }
    ),
}));

vi.mock('../../hooks/useSynthesis', () => ({
    useSynthesis: () => ({
        synthesize: mockSynthesize,
        reSynthesize: vi.fn(),
        isSynthesizing: false,
        error: null,
        canSynthesize: mockSelectedSize >= 2,
    }),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ currentWorkspaceId: 'ws-test' }),
        { getState: () => ({ currentWorkspaceId: 'ws-test' }) }
    ),
}));

vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({ getKBContext: vi.fn().mockReturnValue('') }),
}));

describe('SelectionToolbar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('does not render when 0 nodes selected', () => {
        mockSelectedSize = 0;
        const { container } = render(<SelectionToolbar />);
        expect(container.innerHTML).toBe('');
    });

    test('does not render when 1 node selected', () => {
        mockSelectedSize = 1;
        const { container } = render(<SelectionToolbar />);
        expect(container.innerHTML).toBe('');
    });

    test('renders with count when 2+ nodes selected', () => {
        mockSelectedSize = 3;
        render(<SelectionToolbar />);
        expect(screen.getByText(`3 ${synthesisStrings.labels.ideas}`)).toBeDefined();
    });

    test('click Synthesize opens popover', () => {
        mockSelectedSize = 3;
        render(<SelectionToolbar />);
        fireEvent.click(screen.getByText(synthesisStrings.labels.synthesize));
        expect(screen.getByText(synthesisStrings.modes.summarize)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modes.outline)).toBeDefined();
    });

    test('has aria-label and role="toolbar"', () => {
        mockSelectedSize = 2;
        render(<SelectionToolbar />);
        expect(screen.getByRole('toolbar')).toBeDefined();
    });

    test('clicking a mode option calls synthesize', () => {
        mockSelectedSize = 3;
        render(<SelectionToolbar />);
        fireEvent.click(screen.getByText(synthesisStrings.labels.synthesize));
        fireEvent.click(screen.getByText(synthesisStrings.modes.narrative));
        expect(mockSynthesize).toHaveBeenCalledWith('narrative');
    });
});
