/**
 * useBrowserZoomLock
 *
 * Prevents the **browser** from performing its own pinch-to-zoom on the page
 * so that only the ReactFlow canvas zoom is used.
 *
 * Without this, trackpad pinch / touch pinch sometimes scales the entire
 * viewport (sidebar, toolbar, everything) instead of just the canvas.
 *
 * How it works:
 *  1. Chrome / Firefox report trackpad pinch-to-zoom as `wheel` events with
 *     `ctrlKey: true`. We call `preventDefault()` on those so the browser
 *     compositor doesn't apply page-level zoom.  ReactFlow's internal wheel
 *     handler fires first on its own element and is unaffected.
 *
 *  2. Safari fires proprietary `gesturestart` / `gesturechange` events for
 *     pinch gestures.  We call `preventDefault()` on both to stop Safari's
 *     native zoom.
 *
 * All listeners are attached to `document` (capture: false) and removed on
 * unmount.  Normal scroll (`ctrlKey: false`) is never blocked.
 */
import { useEffect } from 'react';

export function useBrowserZoomLock(): void {
    useEffect(() => {
        /** Block browser zoom triggered by Ctrl+wheel (trackpad pinch). */
        function handleWheel(e: WheelEvent): void {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }

        /** Block Safari's native pinch-zoom gesture. */
        function handleGesture(e: Event): void {
            e.preventDefault();
        }

        document.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('gesturestart', handleGesture, { passive: false } as AddEventListenerOptions);
        document.addEventListener('gesturechange', handleGesture, { passive: false } as AddEventListenerOptions);

        return () => {
            document.removeEventListener('wheel', handleWheel);
            document.removeEventListener('gesturestart', handleGesture);
            document.removeEventListener('gesturechange', handleGesture);
        };
    }, []);
}
