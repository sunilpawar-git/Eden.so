import { MarkerType } from '@xyflow/react';
import { IdeaCard } from './nodes/IdeaCard';
import { DeletableEdge } from './edges/DeletableEdge';

export { DEFAULT_VIEWPORT, DEFAULT_INPUT_MODE } from '../stores/canvasStoreUtils';

export const nodeTypes = { idea: IdeaCard };
export const edgeTypes = { deletable: DeletableEdge };

export const EDGE_TYPE_DELETABLE = 'deletable' as const;

export const DEFAULT_EDGE_OPTIONS = {
    type: EDGE_TYPE_DELETABLE,
    markerEnd: { type: MarkerType.ArrowClosed },
};
export const SNAP_GRID: [number, number] = [16, 16];
export const NO_DRAG_CLASS = 'nodrag';
export const PAN_ACTIVATION_KEY = 'Space';
export const MULTI_SELECT_KEY = 'Shift';
export const BACKGROUND_GAP = 16;
export const BACKGROUND_DOT_SIZE = 1;

export function sourceHandleId(nodeId: string): string { return `${nodeId}-source`; }
export function targetHandleId(nodeId: string): string { return `${nodeId}-target`; }
