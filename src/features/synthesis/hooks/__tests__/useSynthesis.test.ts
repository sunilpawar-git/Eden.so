import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSynthesis } from '../useSynthesis';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';

const mockGenerateContent = vi.fn().mockResolvedValue('AI synthesized output');

vi.mock('@/features/ai/services/geminiService', () => ({
    generateContentWithContext: (...args: unknown[]) => mockGenerateContent(...args),
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ currentWorkspaceId: 'ws-test' }),
        { getState: () => ({ currentWorkspaceId: 'ws-test' }) }
    ),
}));

vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({
        getKBContext: vi.fn().mockReturnValue('kb-context-string'),
    }),
}));

function makeNode(id: string, x = 0, y = 0, extra: Partial<CanvasNode['data']> = {}): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId: 'ws-test',
        type: 'idea',
        data: { heading: `H-${id}`, output: `O-${id}`, colorKey: 'default', ...extra },
        position: { x, y },
        width: 280,
        height: 220,
        createdAt: now,
        updatedAt: now,
    };
}

describe('useSynthesis', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [makeNode('A', 0, 0), makeNode('B', 300, 0), makeNode('C', 600, 0)],
            edges: [
                { id: 'e1', workspaceId: 'ws-test', sourceNodeId: 'A', targetNodeId: 'B', relationshipType: 'related' as const },
                { id: 'e2', workspaceId: 'ws-test', sourceNodeId: 'B', targetNodeId: 'C', relationshipType: 'related' as const },
            ],
            selectedNodeIds: new Set(['A', 'B', 'C']),
        });
    });

    test('canSynthesize is true when 2+ nodes selected', () => {
        const { result } = renderHook(() => useSynthesis());
        expect(result.current.canSynthesize).toBe(true);
    });

    test('canSynthesize is false when <2 nodes selected', () => {
        useCanvasStore.setState({ selectedNodeIds: new Set(['A']) });
        const { result } = renderHook(() => useSynthesis());
        expect(result.current.canSynthesize).toBe(false);
    });

    test('synthesize creates new node with heading "Synthesis of N ideas"', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        const nodes = useCanvasStore.getState().nodes;
        const synthNode = nodes.find((n) => n.data.colorKey === 'synthesis');
        expect(synthNode).toBeDefined();
        expect(synthNode!.data.heading).toBe('Synthesis of 3 ideas');
    });

    test('synthesize creates edges only from root nodes', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        const edges = useCanvasStore.getState().edges;
        const synthNode = useCanvasStore.getState().nodes.find((n) => n.data.colorKey === 'synthesis');
        const synthEdges = edges.filter((e) => e.targetNodeId === synthNode!.id);
        expect(synthEdges).toHaveLength(1);
        expect(synthEdges[0]!.sourceNodeId).toBe('A');
        expect(synthEdges[0]!.relationshipType).toBe('derived');
    });

    test('synthesize sets isSynthesizing during generation', async () => {
        let resolveGenerate: (val: string) => void;
        mockGenerateContent.mockReturnValueOnce(
            new Promise<string>((resolve) => { resolveGenerate = resolve; })
        );

        const { result } = renderHook(() => useSynthesis());

        let synthesizePromise: Promise<void>;
        act(() => {
            synthesizePromise = result.current.synthesize('summarize');
        });

        expect(result.current.isSynthesizing).toBe(true);

        await act(async () => {
            resolveGenerate!('output');
            await synthesizePromise!;
        });

        expect(result.current.isSynthesizing).toBe(false);
    });

    test('synthesize returns early when <2 nodes selected', async () => {
        useCanvasStore.setState({ selectedNodeIds: new Set(['A']) });
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test('Gemini error sets error state without creating node', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('API failed'));
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        expect(result.current.error).toBe('API failed');
        const synthNodes = useCanvasStore.getState().nodes.filter((n) => n.data.colorKey === 'synthesis');
        expect(synthNodes).toHaveLength(0);
    });

    test('new node has synthesisSourceIds equal to all selected IDs', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('narrative');
        });

        const synthNode = useCanvasStore.getState().nodes.find((n) => n.data.colorKey === 'synthesis');
        const sourceIds = synthNode!.data.synthesisSourceIds as string[];
        expect(sourceIds.sort()).toEqual(['A', 'B', 'C']);
    });

    test('new node has synthesisMode matching mode used', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('questions');
        });

        const synthNode = useCanvasStore.getState().nodes.find((n) => n.data.colorKey === 'synthesis');
        expect(synthNode!.data.synthesisMode).toBe('questions');
    });

    test('position is to the right of selection bounding box', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        const synthNode = useCanvasStore.getState().nodes.find((n) => n.data.colorKey === 'synthesis');
        expect(synthNode!.position.x).toBeGreaterThan(600);
    });

    test('generateContentWithContext called with empty array as contextChain', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        expect(mockGenerateContent).toHaveBeenCalledWith(
            expect.any(String),
            [],
            '',
            expect.any(String)
        );
    });

    test('canvas setState called exactly once for atomic update', async () => {
        const setStateSpy = vi.spyOn(useCanvasStore, 'setState');
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.synthesize('summarize');
        });

        const synthCalls = setStateSpy.mock.calls.filter(
            (call) => typeof call[0] === 'function'
        );
        expect(synthCalls).toHaveLength(1);
        setStateSpy.mockRestore();
    });

    test('reSynthesize updates existing node in-place', async () => {
        useCanvasStore.setState({
            nodes: [
                makeNode('A'), makeNode('B'), makeNode('C'),
                makeNode('S', 400, 0, {
                    colorKey: 'synthesis',
                    synthesisSourceIds: ['A', 'B', 'C'],
                    synthesisMode: 'summarize',
                }),
            ],
            edges: [
                { id: 'e1', workspaceId: 'ws-test', sourceNodeId: 'A', targetNodeId: 'B', relationshipType: 'related' as const },
            ],
            selectedNodeIds: new Set(),
        });

        mockGenerateContent.mockResolvedValueOnce('Re-synthesized content');
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.reSynthesize('S');
        });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(4);
        const updatedNode = nodes.find((n) => n.id === 'S');
        expect(updatedNode!.data.output).toBe('Re-synthesized content');
    });

    test('reSynthesize returns early if source node has no synthesisSourceIds', async () => {
        const { result } = renderHook(() => useSynthesis());

        await act(async () => {
            await result.current.reSynthesize('A');
        });

        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
