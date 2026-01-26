import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CanvasView } from '../CanvasView';
import { useCanvasStore } from '../../stores/canvasStore';
import { ReactFlow } from '@xyflow/react';

// Mock ReactFlow component and sub-components
vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        ReactFlow: vi.fn(({ nodes }) => (
            <div data-testid="mock-react-flow" data-nodes={JSON.stringify(nodes)}>
                Mock React Flow
            </div>
        )),
        Background: () => <div data-testid="mock-background" />,
        Controls: () => <div data-testid="mock-controls" />,
    };
});

vi.mock('../AddNodeButton', () => ({
    AddNodeButton: () => <div data-testid="mock-add-node-button" />,
}));

vi.mock('@/features/ai/components/SynthesisButton', () => ({
    SynthesisButton: () => <div data-testid="mock-synthesis-button" />,
}));

describe('CanvasView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'workspace-1',
                    type: 'prompt',
                    data: { content: 'Test Node' },
                    position: { x: 100, y: 100 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should map store nodes to ReactFlow nodes with explicit dimensions', () => {
        render(<CanvasView />);

        // We can't easily check ReactFlow props if it's rendered, 
        // but our mock captures them in data-nodes
        const mockFlow = document.querySelector('[data-testid="mock-react-flow"]');
        const nodes = JSON.parse(mockFlow?.getAttribute('data-nodes') || '[]');

        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toMatchObject({
            id: 'node-1',
            width: 280,
            height: 100,
        });
    });

    it('should use defaultViewport instead of fitView to prevent visibility issue', () => {
        render(<CanvasView />);

        const mockCalls = vi.mocked(ReactFlow).mock.calls;
        const reactFlowProps = mockCalls[0]?.[0] ?? {};
        expect(reactFlowProps.defaultViewport).toEqual({ x: 0, y: 0, zoom: 1 });
        expect(reactFlowProps.fitView).toBeUndefined();
    });
});
