/**
 * useNodeResizeHandlers — Event handler wrappers for NodeResizeButtons.
 * Extracts stopPropagation + resize delegation so the component stays under
 * the 80-line function limit.
 */
import { useCallback } from 'react';
import { useNodeResize } from './useNodeResize';

export function useNodeResizeHandlers(nodeId: string) {
    const {
        expandWidth, expandHeight, shrinkWidth, shrinkHeight,
        canExpandWidth, canExpandHeight, canShrinkWidth, canShrinkHeight,
    } = useNodeResize(nodeId);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleExpandWidth = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        expandWidth();
    }, [expandWidth]);

    const handleExpandHeight = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        expandHeight();
    }, [expandHeight]);

    const handleShrinkWidth = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        shrinkWidth();
    }, [shrinkWidth]);

    const handleShrinkHeight = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        shrinkHeight();
    }, [shrinkHeight]);

    return {
        handleMouseDown,
        handleExpandWidth,
        handleExpandHeight,
        handleShrinkWidth,
        handleShrinkHeight,
        canExpandWidth,
        canExpandHeight,
        canShrinkWidth,
        canShrinkHeight,
    };
}
