/**
 * Subgraph Traversal — extracts a structured SynthesisGraph from selected canvas nodes.
 * Pure function: no store access, no side effects.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { AttachmentMeta } from '@/features/canvas/types/document';

export interface SynthesisNode {
    readonly id: string;
    readonly heading: string;
    readonly content: string;
    readonly attachmentSummary: string;
    readonly depth: number;
    readonly childIds: readonly string[];
}

export interface SynthesisGraph {
    readonly roots: readonly SynthesisNode[];
    readonly rootIds: readonly string[];
    readonly allNodes: readonly SynthesisNode[];
    readonly totalTokenEstimate: number;
}

interface AdjacencyResult {
    childrenMap: Map<string, string[]>;
    incomingCount: Map<string, number>;
}

const EMPTY_GRAPH: SynthesisGraph = { roots: [], rootIds: [], allNodes: [], totalTokenEstimate: 0 };

function getAttachmentSummary(attachments?: AttachmentMeta[]): string {
    if (!attachments?.length) return '';
    const first = attachments[0];
    return first?.extraction?.summary ?? '';
}

function estimateTokens(node: SynthesisNode): number {
    return Math.ceil((node.heading.length + node.content.length + node.attachmentSummary.length) / 4);
}

function buildAdjacency(selectedIds: ReadonlySet<string>, edges: readonly CanvasEdge[]): AdjacencyResult {
    const childrenMap = new Map<string, string[]>();
    const incomingCount = new Map<string, number>();
    for (const id of selectedIds) {
        childrenMap.set(id, []);
        incomingCount.set(id, 0);
    }
    for (const e of edges) {
        if (!selectedIds.has(e.sourceNodeId) || !selectedIds.has(e.targetNodeId)) continue;
        const children = childrenMap.get(e.sourceNodeId);
        if (children) children.push(e.targetNodeId);
        incomingCount.set(e.targetNodeId, (incomingCount.get(e.targetNodeId) ?? 0) + 1);
    }
    return { childrenMap, incomingCount };
}

function findRootIds(selectedIds: ReadonlySet<string>, adj: AdjacencyResult): string[] {
    const roots = [...selectedIds].filter((id) => adj.incomingCount.get(id) === 0);
    if (roots.length > 0) return roots;

    const sorted = [...selectedIds].sort((a, b) => {
        const outA = adj.childrenMap.get(a)?.length ?? 0;
        const outB = adj.childrenMap.get(b)?.length ?? 0;
        return outB !== outA ? outB - outA : a.localeCompare(b);
    });
    const first = sorted[0];
    return first !== undefined ? [first] : [];
}

function bfsDepths(rootIds: string[], childrenMap: Map<string, string[]>): { depthMap: Map<string, number>; visited: Set<string> } {
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [];

    for (const rid of rootIds) {
        queue.push({ id: rid, depth: 0 });
        depthMap.set(rid, 0);
        visited.add(rid);
    }

    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        for (const childId of childrenMap.get(item.id) ?? []) {
            if (!visited.has(childId)) {
                visited.add(childId);
                depthMap.set(childId, item.depth + 1);
                queue.push({ id: childId, depth: item.depth + 1 });
            }
        }
    }
    return { depthMap, visited };
}

function extractHeading(data: CanvasNode['data'] | undefined): string {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- prompt is legacy fallback for heading
    return data?.heading ?? data?.prompt ?? '';
}

export function buildSynthesisGraph(
    selectedIds: ReadonlySet<string>,
    allNodes: readonly CanvasNode[],
    allEdges: readonly CanvasEdge[]
): SynthesisGraph {
    if (selectedIds.size === 0) return EMPTY_GRAPH;

    const adj = buildAdjacency(selectedIds, allEdges);
    const rootIds = findRootIds(selectedIds, adj);
    const { depthMap, visited } = bfsDepths(rootIds, adj.childrenMap);

    for (const id of selectedIds) {
        if (!visited.has(id)) {
            depthMap.set(id, 0);
            rootIds.push(id);
        }
    }

    const nodeMap = new Map(allNodes.filter((n) => selectedIds.has(n.id)).map((n) => [n.id, n]));

    const synthNodes: SynthesisNode[] = [...selectedIds].map((id) => {
        const data = nodeMap.get(id)?.data;
        return {
            id,
            heading: extractHeading(data),
            content: data?.output ?? '',
            attachmentSummary: getAttachmentSummary(data?.attachments),
            depth: depthMap.get(id) ?? 0,
            childIds: (adj.childrenMap.get(id) ?? []).filter((cid) => visited.has(cid)),
        };
    });

    synthNodes.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

    const totalTokenEstimate = synthNodes.reduce((sum, n) => sum + estimateTokens(n), 0);
    const roots = synthNodes.filter((n) => rootIds.includes(n.id));

    return { roots, rootIds: [...rootIds], allNodes: synthNodes, totalTokenEstimate };
}
