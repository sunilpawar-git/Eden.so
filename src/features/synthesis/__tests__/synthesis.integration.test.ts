/**
 * Synthesis Integration Tests — end-to-end flow verification.
 * Mocks only the Gemini API; exercises real store, graph, prompts, and factory.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSynthesis } from '../hooks/useSynthesis';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { synthesisStrings } from '../strings/synthesisStrings';
import type { CanvasNode } from '@/features/canvas/types/node';

const mockGenerate = vi.fn().mockResolvedValue('Generated synthesis content');

vi.mock('@/features/ai/services/geminiService', () => ({
    generateContentWithContext: (...args: unknown[]) => mockGenerate(...args),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ currentWorkspaceId: 'ws-int' }),
        { getState: () => ({ currentWorkspaceId: 'ws-int' }) }
    ),
}));

vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({
        getKBContext: vi.fn().mockReturnValue('kb-ctx'),
    }),
}));

function node(id: string, x = 0, y = 0, extra: Partial<CanvasNode['data']> = {}): CanvasNode {
    const now = new Date();
    return {
        id, workspaceId: 'ws-int', type: 'idea',
        data: { heading: `H-${id}`, output: `O-${id}`, colorKey: 'default', ...extra },
        position: { x, y }, width: 280, height: 220, createdAt: now, updatedAt: now,
    };
}

function edge(src: string, tgt: string) {
    return { id: `e-${src}-${tgt}`, workspaceId: 'ws-int', sourceNodeId: src, targetNodeId: tgt, relationshipType: 'related' as const };
}

describe('Synthesis end-to-end', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerate.mockResolvedValue('Generated synthesis content');
    });

    test('select 3 connected nodes -> synthesize(summarize) -> creates synthesis node', async () => {
        useCanvasStore.setState({
            nodes: [node('A', 0, 0), node('B', 300, 0), node('C', 600, 0)],
            edges: [edge('A', 'B'), edge('B', 'C')],
            selectedNodeIds: new Set(['A', 'B', 'C']),
        });

        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.synthesize('summarize'); });

        const { nodes, edges } = useCanvasStore.getState();
        const synthNode = nodes.find((n) => n.data.colorKey === 'synthesis');
        expect(synthNode).toBeDefined();
        expect(synthNode!.data.heading).toBe(`${synthesisStrings.labels.synthesisOf} 3 ${synthesisStrings.labels.ideas}`);
        expect(synthNode!.data.output).toBe('Generated synthesis content');
        expect(synthNode!.data.synthesisSourceIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
        expect(synthNode!.data.synthesisMode).toBe('summarize');

        const synthEdges = edges.filter((e) => e.targetNodeId === synthNode!.id);
        expect(synthEdges).toHaveLength(1);
        expect(synthEdges[0]!.sourceNodeId).toBe('A');
        expect(synthEdges[0]!.relationshipType).toBe('derived');

        expect(synthNode!.position.x).toBeGreaterThan(600);
    });

    test('synthesize(questions) -> prompt contains questionsInstruction', async () => {
        useCanvasStore.setState({
            nodes: [node('A'), node('B')],
            edges: [edge('A', 'B')],
            selectedNodeIds: new Set(['A', 'B']),
        });

        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.synthesize('questions'); });

        const prompt = mockGenerate.mock.calls[0]![0] as string;
        expect(prompt).toContain(synthesisStrings.prompts.questionsInstruction);
    });

    test('synthesis with KB context uses synthesis budget', async () => {
        useCanvasStore.setState({
            nodes: [node('A'), node('B')],
            edges: [edge('A', 'B')],
            selectedNodeIds: new Set(['A', 'B']),
        });

        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.synthesize('summarize'); });

        expect(mockGenerate).toHaveBeenCalledWith(
            expect.any(String), [], '', expect.any(String)
        );
    });

    test('re-synthesis updates existing node, no new node created', async () => {
        useCanvasStore.setState({
            nodes: [
                node('A'), node('B'), node('C'),
                node('S', 400, 0, {
                    colorKey: 'synthesis',
                    synthesisSourceIds: ['A', 'B', 'C'],
                    synthesisMode: 'outline',
                }),
            ],
            edges: [edge('A', 'B'), edge('B', 'C')],
            selectedNodeIds: new Set(),
        });

        mockGenerate.mockResolvedValueOnce('Updated content');
        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.reSynthesize('S'); });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(4);
        const updated = nodes.find((n) => n.id === 'S');
        expect(updated!.data.output).toBe('Updated content');
    });

    test('re-synthesis after source deletion works with remaining sources', async () => {
        useCanvasStore.setState({
            nodes: [
                node('A'), node('B'),
                node('S', 400, 0, {
                    colorKey: 'synthesis',
                    synthesisSourceIds: ['A', 'B', 'C'],
                    synthesisMode: 'summarize',
                }),
            ],
            edges: [edge('A', 'B')],
            selectedNodeIds: new Set(),
        });

        mockGenerate.mockResolvedValueOnce('From 2 remaining');
        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.reSynthesize('S'); });

        const updated = useCanvasStore.getState().nodes.find((n) => n.id === 'S');
        expect(updated!.data.output).toBe('From 2 remaining');
    });

    test('recursive synthesis: synthesis node in selection treated as regular content', async () => {
        useCanvasStore.setState({
            nodes: [
                node('S1', 0, 0, {
                    colorKey: 'synthesis', heading: 'Prev Synthesis',
                    output: 'Previous synthesis content',
                    synthesisSourceIds: ['X', 'Y'],
                    synthesisMode: 'summarize',
                }),
                node('D', 300, 0),
                node('E', 600, 0),
            ],
            edges: [edge('S1', 'D'), edge('D', 'E')],
            selectedNodeIds: new Set(['S1', 'D', 'E']),
        });

        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.synthesize('narrative'); });

        const prompt = mockGenerate.mock.calls[0]![0] as string;
        expect(prompt).toContain('Prev Synthesis');
        expect(prompt).toContain('Previous synthesis content');

        const nodes = useCanvasStore.getState().nodes;
        const newSynth = nodes.find((n) => n.data.colorKey === 'synthesis' && n.id !== 'S1');
        expect(newSynth).toBeDefined();
        expect((newSynth!.data.synthesisSourceIds as string[]).sort()).toEqual(['D', 'E', 'S1']);
    });

    test('Gemini error -> no node created, error state set', async () => {
        useCanvasStore.setState({
            nodes: [node('A'), node('B')],
            edges: [edge('A', 'B')],
            selectedNodeIds: new Set(['A', 'B']),
        });

        mockGenerate.mockRejectedValueOnce(new Error('API quota exceeded'));
        const { result } = renderHook(() => useSynthesis());
        await act(async () => { await result.current.synthesize('summarize'); });

        expect(result.current.error).toBe('API quota exceeded');
        const synthNodes = useCanvasStore.getState().nodes.filter((n) => n.data.colorKey === 'synthesis');
        expect(synthNodes).toHaveLength(0);
    });
});
