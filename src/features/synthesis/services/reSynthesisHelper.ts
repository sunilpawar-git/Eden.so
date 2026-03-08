/**
 * Re-synthesis helper — updates an existing synthesis node with fresh AI output.
 * Extracted from useSynthesis to keep the hook under 75 lines.
 */
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { generateContentWithContext } from '@/features/ai/services/geminiService';
import { buildSynthesisGraph } from './subgraphTraversal';
import { buildSynthesisPrompt, type SynthesisMode } from './synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';
import type { KBContextFn } from './executeSynthesis';

const SYNTHESIS_MODES = new Set(['summarize', 'outline', 'narrative', 'questions']);
function isSynthesisMode(value: unknown): value is SynthesisMode {
    return typeof value === 'string' && SYNTHESIS_MODES.has(value);
}

/**
 * Re-run synthesis on an existing synthesis node using its stored source IDs and mode.
 * @throws {Error} If `generateContentWithContext` rejects (network, quota, or model error).
 */
export async function executeReSynthesis(
    nodeId: string,
    mode: SynthesisMode | undefined,
    getKBContext: KBContextFn
): Promise<void> {
    const { nodes, edges } = useCanvasStore.getState();
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode?.data.synthesisSourceIds) return;

    const rawIds = targetNode.data.synthesisSourceIds;
    if (!Array.isArray(rawIds)) return;
    const sourceIds = new Set<string>(rawIds);
    const existingIds = new Set(
        nodes.filter((n) => sourceIds.has(n.id)).map((n) => n.id)
    );
    if (existingIds.size < 2) return;

    const graph = buildSynthesisGraph(existingIds, nodes, edges);
    if (graph.allNodes.length === 0) return;

    const storedMode = targetNode.data.synthesisMode;
    const resolvedMode: SynthesisMode =
        mode ?? (isSynthesisMode(storedMode) ? storedMode : 'summarize');
    const prompt = buildSynthesisPrompt(graph, resolvedMode);
    const kbContext = getKBContext(prompt, 'synthesis');

    const content = await generateContentWithContext(prompt, [], '', kbContext);

    const heading = `${synthesisStrings.labels.synthesisOf} ${graph.allNodes.length} ${synthesisStrings.labels.ideas}`;
    useCanvasStore.getState().updateNodeOutput(nodeId, content);
    useCanvasStore.getState().updateNodeHeading(nodeId, heading);
}
