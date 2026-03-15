/**
 * useFitViewAfterArrange — Smoothly centers viewport after arrange animation completes.
 *
 * Listens for a custom DOM event dispatched by WorkspaceControls.
 * Must be rendered inside <ReactFlow> to access useReactFlow().
 * Timer is ref-tracked to prevent leaks on unmount and stacking on rapid arrange.
 */
import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ANIMATION_DURATION_MS } from '../services/arrangeAnimationReducer';

/** Custom event name — dispatched after arrange animation starts */
export const FIT_VIEW_AFTER_ARRANGE_EVENT = 'fit-view-after-arrange';

const FIT_VIEW_PADDING = 0.12;
const FIT_VIEW_DURATION_MS = 500;

/**
 * Listens for FIT_VIEW_AFTER_ARRANGE_EVENT and calls fitView with a delay.
 * The delay allows the arrange animation to reach final positions before fitting.
 */
export function useFitViewAfterArrange(): void {
    const { fitView } = useReactFlow();
    const fitViewRef = useRef(fitView);
    fitViewRef.current = fitView;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ totalAnimMs?: number }>).detail;
            const totalAnimMs = detail.totalAnimMs ?? ANIMATION_DURATION_MS;
            const delayMs = totalAnimMs + 100;

            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                requestAnimationFrame(() => {
                    void fitViewRef.current({
                        padding: FIT_VIEW_PADDING,
                        duration: FIT_VIEW_DURATION_MS,
                    });
                });
            }, delayMs);
        };

        window.addEventListener(FIT_VIEW_AFTER_ARRANGE_EVENT, handler);
        return () => {
            window.removeEventListener(FIT_VIEW_AFTER_ARRANGE_EVENT, handler);
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);
}
