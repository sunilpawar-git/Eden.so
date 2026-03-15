/**
 * useArrangeAnimation Hook — Staggered column-cascade animation for arrange.
 *
 * Architecture:
 * - Uses React.useReducer with arrangeAnimationReducer (zero Zustand coupling).
 * - Computes per-node transition-delay from column assignments.
 * - Sets data attributes on ReactFlow node wrappers for CSS transitions.
 * - Schedules cleanup via setTimeout (no useEffect for cleanup — avoids stale closure).
 * - Timer is ref-tracked and cleared on unmount to prevent memory leaks.
 * - Reads canvas store via getState() only — no subscriptions.
 */
import { useCallback, useRef, useReducer, useEffect, type RefObject } from 'react';
import {
    arrangeAnimationReducer,
    computeTotalAnimationMs,
    INITIAL_ARRANGE_ANIM_STATE,
    STAGGER_DELAY_PER_COLUMN_MS,
} from '../services/arrangeAnimationReducer';
import { computeColumnAssignments } from '../services/gridLayoutService';
import { useCanvasStore } from '../stores/canvasStore';
import { resolveGridColumnsFromStore } from '../services/gridColumnsResolver';

const CANVAS_CONTAINER_SELECTOR = '[data-canvas-container]';
const ARRANGE_DATA_ATTR = 'data-arranging';
const CLEANUP_BUFFER_MS = 50;

/**
 * Wraps an arrange function with a staggered column-cascade CSS animation.
 * Sets per-node `--arrange-delay` custom property and `data-arranging` on the container.
 *
 * Returns `animatedArrange` to trigger the animation and `lastTotalAnimMs` ref
 * for callers that need the actual computed animation duration.
 */
export function useArrangeAnimation(
    containerRef: RefObject<HTMLElement | null> | null,
    arrangeNodes: () => void,
) {
    const [, dispatch] = useReducer(arrangeAnimationReducer, INITIAL_ARRANGE_ANIM_STATE);
    const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTotalAnimMsRef = useRef(0);

    useEffect(() => {
        return () => {
            if (cleanupTimerRef.current !== null) {
                clearTimeout(cleanupTimerRef.current);
                cleanupTimerRef.current = null;
            }
        };
    }, []);

    const animatedArrange = useCallback(() => {
        const container = containerRef?.current
            ?? document.querySelector<HTMLElement>(CANVAS_CONTAINER_SELECTOR);

        const nodes = useCanvasStore.getState().nodes;
        const cols = resolveGridColumnsFromStore();
        const columnAssignments = computeColumnAssignments(nodes, cols);

        dispatch({ type: 'START_ANIMATE', columnAssignments });

        if (container) {
            container.setAttribute(ARRANGE_DATA_ATTR, 'true');

            const nodeEls = container.querySelectorAll<HTMLElement>(':scope .react-flow__node');
            for (const el of nodeEls) {
                const nodeId = el.getAttribute('data-id');
                if (nodeId != null) {
                    const colIdx = columnAssignments.get(nodeId);
                    const delayMs = colIdx != null ? colIdx * STAGGER_DELAY_PER_COLUMN_MS : 0;
                    el.style.setProperty('--arrange-delay', `${delayMs}ms`);
                }
            }
        }

        arrangeNodes();

        if (cleanupTimerRef.current !== null) {
            clearTimeout(cleanupTimerRef.current);
        }

        const totalMs = computeTotalAnimationMs(columnAssignments) + CLEANUP_BUFFER_MS;
        lastTotalAnimMsRef.current = totalMs;

        cleanupTimerRef.current = setTimeout(() => {
            dispatch({ type: 'RESET' });

            if (container) {
                container.removeAttribute(ARRANGE_DATA_ATTR);
                const nodeEls = container.querySelectorAll<HTMLElement>(':scope .react-flow__node');
                for (const el of nodeEls) {
                    el.style.removeProperty('--arrange-delay');
                }
            }
            cleanupTimerRef.current = null;
        }, totalMs);
    }, [containerRef, arrangeNodes]);

    return { animatedArrange, lastTotalAnimMsRef };
}
