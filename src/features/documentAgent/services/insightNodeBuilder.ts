/**
 * Insight Node Builder — pure functions for constructing insight spawn results.
 * No side effects. Input → output. Testable without mocking stores.
 */
import { createIdeaNode } from '@/features/canvas/types/node';
import { createEdge } from '@/features/canvas/types/edge';
import { calculateBranchPlacement } from '@/features/canvas/services/freeFlowPlacementService';
import { calculateMasonryPosition } from '@/features/canvas/services/gridLayoutService';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode, NodePosition, NodeColorKey } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { ExtractionResult, ConfidenceLevel } from '../types/documentAgent';
import { formatInsightMarkdown } from './insightFormatter';

export interface InsightSpawnResult {
    node: CanvasNode;
    edge: CanvasEdge;
}

const CONFIDENCE_COLOR: Record<ConfidenceLevel, NodeColorKey> = {
    high: 'success',
    medium: 'warning',
    low: 'default',
};

/** Pure function: builds insight node + edge from extraction result */
export function buildInsightSpawn(
    parentNodeId: string,
    workspaceId: string,
    position: NodePosition,
    result: ExtractionResult,
    filename: string,
): InsightSpawnResult {
    const nodeId = `insight-${crypto.randomUUID()}`;
    const node = createIdeaNode(nodeId, workspaceId, position);

    node.data = {
        ...node.data,
        heading: strings.documentAgent.insightHeading,
        output: formatInsightMarkdown(result, filename),
        colorKey: CONFIDENCE_COLOR[result.confidence],
        tags: [result.classification, strings.documentAgent.autoExtractedTag],
        includeInAIPool: true,
    };

    const edge = createEdge(
        `edge-${crypto.randomUUID()}`,
        workspaceId,
        parentNodeId,
        nodeId,
        'derived',
    );

    return { node, edge };
}

/** Calculate position for insight node based on layout mode */
export function calculateInsightPosition(
    parentNode: CanvasNode,
    existingNodes: CanvasNode[],
    isFreeFlow: boolean,
): NodePosition {
    return isFreeFlow
        ? calculateBranchPlacement(parentNode, existingNodes)
        : calculateMasonryPosition(existingNodes);
}
