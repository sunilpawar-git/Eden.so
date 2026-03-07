/**
 * branchTraversal — Pure functions for walking canvas topology into an export tree.
 * No side effects, no store calls — receives all data as arguments.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

export interface AttachmentExport {
    readonly filename: string;
    readonly summary: string;
}

export interface BranchNode {
    readonly id: string;
    readonly heading: string;
    readonly content: string;
    readonly attachments: readonly AttachmentExport[];
    readonly tags: readonly string[];
    readonly children: readonly BranchNode[];
    readonly depth: number;
    readonly isSynthesis: boolean;
    readonly synthesisSourceCount: number;
}

function buildAdjacency(edges: readonly CanvasEdge[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        const children = adj.get(edge.sourceNodeId);
        if (children) {
            children.push(edge.targetNodeId);
        } else {
            adj.set(edge.sourceNodeId, [edge.targetNodeId]);
        }
    }
    return adj;
}

function buildNodeMap(nodes: readonly CanvasNode[]): Map<string, CanvasNode> {
    const map = new Map<string, CanvasNode>();
    for (const node of nodes) {
        map.set(node.id, node);
    }
    return map;
}

function extractAttachments(node: CanvasNode): readonly AttachmentExport[] {
    const attachments = node.data.attachments;
    if (!attachments || attachments.length === 0) return [];
    return attachments
        .map((a) => ({ filename: a.filename, summary: a.extraction?.summary ?? '' }))
        .filter((a) => a.summary.length > 0);
}

function buildBranchNode(
    nodeId: string,
    nodeMap: Map<string, CanvasNode>,
    adjacency: Map<string, string[]>,
    visited: Set<string>,
    depth: number,
    crossRefLabel: string
): BranchNode | null {
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    if (visited.has(nodeId)) {
        return {
            id: nodeId,
            heading: node.data.heading ?? node.data.prompt ?? '', // eslint-disable-line @typescript-eslint/no-deprecated
            content: crossRefLabel,
            attachments: [],
            tags: [],
            children: [],
            depth,
            isSynthesis: false,
            synthesisSourceCount: 0,
        };
    }

    visited.add(nodeId);

    const childIds = adjacency.get(nodeId) ?? [];
    const children: BranchNode[] = [];
    for (const childId of childIds) {
        const child = buildBranchNode(childId, nodeMap, adjacency, visited, depth + 1, crossRefLabel);
        if (child) children.push(child);
    }

    const sourceIds = node.data.synthesisSourceIds;
    return {
        id: nodeId,
        heading: node.data.heading ?? node.data.prompt ?? '', // eslint-disable-line @typescript-eslint/no-deprecated
        content: node.data.output ?? '',
        attachments: extractAttachments(node),
        tags: node.data.tags ?? [],
        children,
        depth,
        isSynthesis: node.data.colorKey === 'synthesis',
        synthesisSourceCount: Array.isArray(sourceIds) ? sourceIds.length : 0,
    };
}

export function collectBranch(
    rootId: string,
    allNodes: readonly CanvasNode[],
    allEdges: readonly CanvasEdge[],
    crossRefLabel = '(see above)'
): BranchNode | null {
    const nodeMap = buildNodeMap(allNodes);
    if (!nodeMap.has(rootId)) return null;

    const adjacency = buildAdjacency(allEdges);
    const visited = new Set<string>();
    return buildBranchNode(rootId, nodeMap, adjacency, visited, 0, crossRefLabel);
}

export function collectMultiRootBranch(
    selectedIds: ReadonlySet<string>,
    allNodes: readonly CanvasNode[],
    allEdges: readonly CanvasEdge[],
    crossRefLabel = '(see above)'
): readonly BranchNode[] {
    const relevantEdges = allEdges.filter(
        (e) => selectedIds.has(e.sourceNodeId) && selectedIds.has(e.targetNodeId)
    );

    const hasIncoming = new Set<string>();
    for (const edge of relevantEdges) {
        hasIncoming.add(edge.targetNodeId);
    }

    const rootIds: string[] = [];
    for (const id of selectedIds) {
        if (!hasIncoming.has(id)) rootIds.push(id);
    }

    if (rootIds.length === 0 && selectedIds.size > 0) {
        const firstId = [...selectedIds][0];
        if (firstId) rootIds.push(firstId);
    }

    const selectedNodes = allNodes.filter((n) => selectedIds.has(n.id));
    const nodeMap = buildNodeMap(selectedNodes);
    const adjacency = buildAdjacency(relevantEdges);
    const visited = new Set<string>();
    const roots: BranchNode[] = [];

    for (const rootId of rootIds) {
        const root = buildBranchNode(rootId, nodeMap, adjacency, visited, 0, crossRefLabel);
        if (root) roots.push(root);
    }

    return roots;
}
