import { MarkerType } from '@xyflow/react';
import { IdeaCard } from './nodes/IdeaCard';
import { DeletableEdge } from './edges/DeletableEdge';

export const nodeTypes = { idea: IdeaCard };
export const edgeTypes = { deletable: DeletableEdge };

export const DEFAULT_EDGE_OPTIONS = {
    type: 'deletable' as const,
    markerEnd: { type: MarkerType.ArrowClosed },
};
export const DEFAULT_VIEWPORT = { x: 32, y: 32, zoom: 1 };
export const SNAP_GRID: [number, number] = [16, 16];
