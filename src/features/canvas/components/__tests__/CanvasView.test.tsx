import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasView } from '../CanvasView';
import { useCanvasStore } from '../../stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ReactFlow, ConnectionLineType } from '@xyflow/react';

// Mock ReactFlow component and sub-components
vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        ReactFlow: vi.fn(({ nodes, children }) => (
            <div data-testid="mock-react-flow" data-nodes={JSON.stringify(nodes)}>
                {children}
            </div>
        )),
        Background: vi.fn(() => <div data-testid="mock-background" />),
        Controls: () => <div data-testid="mock-controls" />,
        useNodesState: (initialNodes: unknown[]) => [initialNodes, vi.fn(), vi.fn()],
        useEdgesState: (initialEdges: unknown[]) => [initialEdges, vi.fn(), vi.fn()],
    };
});



describe('CanvasView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'workspace-1',
                    type: 'idea',
                    data: { prompt: 'Test Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                    position: { x: 100, y: 100 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should map store nodes to ReactFlow nodes correctly', () => {
        render(<CanvasView />);

        // Check that ReactFlow is rendered with nodes from store
        const mockFlow = document.querySelector('[data-testid="mock-react-flow"]');
        const nodes = JSON.parse(mockFlow?.getAttribute('data-nodes') || '[]');

        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toMatchObject({
            id: 'node-1',
            type: 'idea',
            position: { x: 100, y: 100 },
        });
    });

    it('should configure ReactFlow with proper viewport settings', () => {
        render(<CanvasView />);

        const mockCalls = vi.mocked(ReactFlow).mock.calls;
        const reactFlowProps = mockCalls[0]?.[0] ?? {};
        expect(reactFlowProps.defaultViewport).toEqual({ x: 32, y: 32, zoom: 1 });
        // fitView is disabled to prevent auto-zoom making nodes appear oversized
        expect(reactFlowProps.fitView).toBeUndefined();
    });

    describe('Edge configuration', () => {
        beforeEach(() => {
            // Setup store with edges for edge tests
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Source Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                        position: { x: 100, y: 100 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: 'node-2',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Target Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                        position: { x: 100, y: 300 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [
                    {
                        id: 'edge-1',
                        workspaceId: 'workspace-1',
                        sourceNodeId: 'node-1',
                        targetNodeId: 'node-2',
                        relationshipType: 'derived',
                    },
                ],
                selectedNodeIds: new Set(),
            });
        });

        it('should use bezier edge type for smooth curves', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};
            const edges = reactFlowProps.edges ?? [];

            // Edges should have bezier type
            expect(edges[0]).toMatchObject({
                type: 'bezier',
            });
        });

        it('should use Bezier connection line type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};

            expect(reactFlowProps.connectionLineType).toBe(ConnectionLineType.Bezier);
        });

        it('should configure default edge options with bezier type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};

            expect(reactFlowProps.defaultEdgeOptions).toMatchObject({
                type: 'bezier',
            });
        });

        it('should animate edges with derived relationship type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};
            const edges = reactFlowProps.edges ?? [];

            // Edge with 'derived' relationship should be animated
            expect(edges[0]).toMatchObject({
                animated: true,
            });
        });
    });

    describe('Selection sync', () => {
        it('should pass selected=true to nodes in selectedNodeIds', () => {
            // Set a node as selected in the store
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Test Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                        position: { x: 100, y: 100 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: 'node-2',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Another Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                        position: { x: 200, y: 200 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [],
                selectedNodeIds: new Set(['node-1']), // node-1 is selected
            });

            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};
            const nodes = reactFlowProps.nodes ?? [];

            // node-1 should have selected=true
            const node1 = nodes.find((n: { id: string }) => n.id === 'node-1');
            expect(node1?.selected).toBe(true);

            // node-2 should have selected=false
            const node2 = nodes.find((n: { id: string }) => n.id === 'node-2');
            expect(node2?.selected).toBe(false);
        });

        it('should pass selected=false when no nodes are selected', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Test Node', output: undefined, isGenerating: false, isPromptCollapsed: false },
                        position: { x: 100, y: 100 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [],
                selectedNodeIds: new Set(), // No selection
            });

            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};
            const nodes = reactFlowProps.nodes ?? [];

            expect(nodes[0]?.selected).toBe(false);
        });
    });

    describe('Canvas scroll mode', () => {
        it('should set zoomOnScroll=true when scroll mode is zoom', () => {
            useSettingsStore.setState({ canvasScrollMode: 'zoom' });
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};
            expect(props.zoomOnScroll).toBe(true);
            expect(props.panOnScroll).toBe(false);
        });

        it('should set panOnScroll=true when scroll mode is navigate', () => {
            useSettingsStore.setState({ canvasScrollMode: 'navigate' });
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};
            expect(props.zoomOnScroll).toBe(false);
            expect(props.panOnScroll).toBe(true);
        });
    });

    describe('Canvas grid wiring', () => {
        it('should render Background when canvasGrid is true', () => {
            useSettingsStore.setState({ canvasGrid: true });
            render(<CanvasView />);
            expect(screen.getByTestId('mock-background')).toBeInTheDocument();
        });

        it('should not render Background when canvasGrid is false', () => {
            useSettingsStore.setState({ canvasGrid: false });
            render(<CanvasView />);
            expect(screen.queryByTestId('mock-background')).not.toBeInTheDocument();
        });
    });
});
