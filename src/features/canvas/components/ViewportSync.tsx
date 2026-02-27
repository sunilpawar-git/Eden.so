/**
 * ViewportSync - Synchronizes ReactFlow viewport with Zustand store
 * Must be rendered as a child of ReactFlow to access useReactFlow hook
 */
import { useEffect, useRef } from 'react';
import { useReactFlow, type Viewport } from '@xyflow/react';

interface ViewportSyncProps {
    viewport: Viewport;
}

export function ViewportSync({ viewport }: ViewportSyncProps) {
    const { setViewport } = useReactFlow();
    const isFirstRenderRef = useRef(true);
    const prevViewportRef = useRef<Viewport>(viewport);

    useEffect(() => {
        const prev = prevViewportRef.current;
        const isFirstRender = isFirstRenderRef.current;

        // Sync on first render, or when viewport values actually change
        if (
            isFirstRender ||
            viewport.x !== prev.x ||
            viewport.y !== prev.y ||
            viewport.zoom !== prev.zoom
        ) {
            setViewport(viewport, { duration: 0 });
            prevViewportRef.current = viewport;
            isFirstRenderRef.current = false;
        }
    }, [viewport, setViewport]);

    return null;
}
