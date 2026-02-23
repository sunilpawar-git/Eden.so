import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasView } from '../CanvasView';
import { useCanvasStore } from '../../stores/canvasStore';
import { useFocusStore } from '../../stores/focusStore';
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
        ZoomControls: () => <div data-testid="mock-zoom-controls" />,
        useNodesState: (initialNodes: unknown[]) => [initialNodes, vi.fn(), vi.fn()],
        useEdgesState: (initialEdges: unknown[]) => [initialEdges, vi.fn(), vi.fn()],
    };
});

// Mock ZoomControls import
vi.mock('../ZoomControls', () => ({
    ZoomControls: () => <div data-testid="mock-zoom-controls" />,
}));

// Mock FocusOverlay import
vi.mock('../FocusOverlay', () => ({
    FocusOverlay: () => <div data-testid="mock-focus-overlay" />,
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
        useSettingsStore.setState({
            isCanvasLocked: false,
            canvasScrollMode: 'zoom'
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

        it('should use deletable custom edge type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};
            const edges = reactFlowProps.edges ?? [];

            expect(edges[0]).toMatchObject({
                type: 'deletable',
            });
        });

        it('should register DeletableEdge as custom edge type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};

            expect(reactFlowProps.edgeTypes).toBeDefined();
            expect(reactFlowProps.edgeTypes).toHaveProperty('deletable');
        });

        it('should use Bezier connection line type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};

            expect(reactFlowProps.connectionLineType).toBe(ConnectionLineType.Bezier);
        });

        it('should configure default edge options with deletable type', () => {
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const reactFlowProps = mockCalls[0]?.[0] ?? {};

            expect(reactFlowProps.defaultEdgeOptions).toMatchObject({
                type: 'deletable',
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

    describe('Pin prevents drag', () => {
        it('should set draggable=false when node isPinned', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'pinned-node',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Pinned', output: undefined, isGenerating: false, isPromptCollapsed: false, isPinned: true, isCollapsed: false },
                        position: { x: 50, y: 50 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [],
                selectedNodeIds: new Set(),
            });

            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};
            const nodes = props.nodes ?? [];
            expect(nodes[0]?.draggable).toBe(false);
        });

        it('should set draggable=true when node is not pinned', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'free-node',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Free', output: undefined, isGenerating: false, isPromptCollapsed: false, isPinned: false, isCollapsed: false },
                        position: { x: 50, y: 50 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [],
                selectedNodeIds: new Set(),
            });

            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};
            const nodes = props.nodes ?? [];
            expect(nodes[0]?.draggable).toBe(true);
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

    describe('Locked Canvas', () => {
        beforeEach(() => {
            useSettingsStore.setState({ isCanvasLocked: true });
        });

        it('should disable interactions when locked', () => {
            render(<CanvasView />);
            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};

            expect(props.nodesDraggable).toBe(false);
            expect(props.elementsSelectable).toBe(false);
            expect(props.nodesConnectable).toBe(false);
            expect(props.panOnDrag).toBe(false);
            // Both zoom and pan should be disabled
            expect(props.zoomOnScroll).toBe(false);
            expect(props.panOnScroll).toBe(false);
        });

        it('should set all nodes to draggable=false when locked', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'free-node',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        data: { prompt: 'Free', output: undefined, isGenerating: false, isPromptCollapsed: false, isPinned: false, isCollapsed: false },
                        position: { x: 50, y: 50 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                edges: [],
                selectedNodeIds: new Set(),
            });

            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};
            const nodes = props.nodes ?? [];

            expect(nodes[0]?.draggable).toBe(false);
        });

        it('should render ZoomControls', () => {
            render(<CanvasView />);
            expect(screen.getByTestId('mock-zoom-controls')).toBeInTheDocument();
        });
    });

    describe('Focus mode integration', () => {
        beforeEach(() => {
            useFocusStore.setState({ focusedNodeId: null });
        });

        it('should render FocusOverlay component', () => {
            render(<CanvasView />);
            expect(screen.getByTestId('mock-focus-overlay')).toBeInTheDocument();
        });

        it('should disable canvas interactions when a node is focused', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};

            expect(props.nodesDraggable).toBe(false);
            expect(props.elementsSelectable).toBe(false);
            expect(props.nodesConnectable).toBe(false);
            expect(props.panOnDrag).toBe(false);
            expect(props.zoomOnScroll).toBe(false);
            expect(props.panOnScroll).toBe(false);
        });

        it('should not disable canvas interactions when no node is focused', () => {
            useFocusStore.setState({ focusedNodeId: null });
            render(<CanvasView />);

            const mockCalls = vi.mocked(ReactFlow).mock.calls;
            const props = mockCalls[0]?.[0] ?? {};

            expect(props.nodesDraggable).toBe(true);
            expect(props.elementsSelectable).toBe(true);
            expect(props.nodesConnectable).toBe(true);
            expect(props.panOnDrag).toBe(true);
        });
    });
});
