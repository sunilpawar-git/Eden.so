/**
 * useNodeResize Hook - ViewModel for node resize arrow buttons
 * Provides expand actions and canExpand flags for width/height
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import {
    RESIZE_INCREMENT_PX,
    MAX_NODE_WIDTH,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
} from '../types/node';

export interface UseNodeResizeResult {
    expandWidth: () => void;
    expandHeight: () => void;
    canExpandWidth: boolean;
    canExpandHeight: boolean;
}

/**
 * Hook for node resize arrow button functionality
 * @param nodeId - The ID of the node to resize
 * @returns Expand actions and canExpand boolean flags
 */
export function useNodeResize(nodeId: string): UseNodeResizeResult {
    const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId));
    const updateNodeDimensions = useCanvasStore((s) => s.updateNodeDimensions);
    const arrangeAfterResize = useCanvasStore((s) => s.arrangeAfterResize);

    const currentWidth = node?.width ?? DEFAULT_NODE_WIDTH;
    const currentHeight = node?.height ?? DEFAULT_NODE_HEIGHT;

    const canExpandWidth = currentWidth < MAX_NODE_WIDTH;
    const canExpandHeight = currentHeight < MAX_NODE_HEIGHT;

    const expandWidth = useCallback(() => {
        if (canExpandWidth) {
            updateNodeDimensions(nodeId, currentWidth + RESIZE_INCREMENT_PX, currentHeight);
            arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canExpandWidth, updateNodeDimensions, arrangeAfterResize]);

    const expandHeight = useCallback(() => {
        if (canExpandHeight) {
            updateNodeDimensions(nodeId, currentWidth, currentHeight + RESIZE_INCREMENT_PX);
            arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canExpandHeight, updateNodeDimensions, arrangeAfterResize]);

    return { expandWidth, expandHeight, canExpandWidth, canExpandHeight };
}
