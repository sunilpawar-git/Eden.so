/**
 * Shared setup for IdeaCard resize tests.
 */
import { vi } from 'vitest';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

export const defaultData: IdeaNodeData = {
    prompt: 'Test prompt',
    output: 'Test output',
    isGenerating: false,
    isPromptCollapsed: false,
};

export const defaultProps = {
    id: 'resize-test-node',
    data: defaultData,
    type: 'idea' as const,
    selected: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
};

export async function setupResizeTests(): Promise<void> {
    vi.clearAllMocks();
    const { resetMockState, initNodeInputStore, initStateStore } = await import(
        './helpers/tipTapTestMock'
    );
    resetMockState();
    initNodeInputStore(useCanvasStore);
    initStateStore(useCanvasStore);
    useCanvasStore.setState({
        nodes: [],
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
}
