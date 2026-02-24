/**
 * useNodeResize Hook - ViewModel for node resize arrow buttons
 * Provides expand actions and canExpand flags for width/height
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
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
    shrinkWidth: () => void;
    shrinkHeight: () => void;
    canExpandWidth: boolean;
    canExpandHeight: boolean;
    canShrinkWidth: boolean;
    canShrinkHeight: boolean;
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
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);

    const currentWidth = node?.width ?? DEFAULT_NODE_WIDTH;
    const currentHeight = node?.height ?? DEFAULT_NODE_HEIGHT;

    const canExpandWidth = currentWidth < MAX_NODE_WIDTH;
    const canExpandHeight = currentHeight < MAX_NODE_HEIGHT;
    const canShrinkWidth = currentWidth > DEFAULT_NODE_WIDTH;
    const canShrinkHeight = currentHeight > DEFAULT_NODE_HEIGHT;

    const expandWidth = useCallback(() => {
        if (canExpandWidth) {
            updateNodeDimensions(nodeId, currentWidth + RESIZE_INCREMENT_PX, currentHeight);
            if (!canvasFreeFlow) arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canExpandWidth, canvasFreeFlow, updateNodeDimensions, arrangeAfterResize]);

    const expandHeight = useCallback(() => {
        if (canExpandHeight) {
            updateNodeDimensions(nodeId, currentWidth, currentHeight + RESIZE_INCREMENT_PX);
            if (!canvasFreeFlow) arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canExpandHeight, canvasFreeFlow, updateNodeDimensions, arrangeAfterResize]);

    const shrinkWidth = useCallback(() => {
        if (canShrinkWidth) {
            updateNodeDimensions(nodeId, currentWidth - RESIZE_INCREMENT_PX, currentHeight);
            if (!canvasFreeFlow) arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canShrinkWidth, canvasFreeFlow, updateNodeDimensions, arrangeAfterResize]);

    const shrinkHeight = useCallback(() => {
        if (canShrinkHeight) {
            updateNodeDimensions(nodeId, currentWidth, currentHeight - RESIZE_INCREMENT_PX);
            if (!canvasFreeFlow) arrangeAfterResize(nodeId);
        }
    }, [nodeId, currentWidth, currentHeight, canShrinkHeight, canvasFreeFlow, updateNodeDimensions, arrangeAfterResize]);

    return { expandWidth, expandHeight, shrinkWidth, shrinkHeight, canExpandWidth, canExpandHeight, canShrinkWidth, canShrinkHeight };
}
