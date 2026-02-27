/**
 * proximityHelpers — Pure functions for proximity math and z-index elevation.
 * Extracted from useProximityBar to meet hook line-limit (SRP).
 */

export const PROXIMITY_THRESHOLD_PX = 80;
export const FLIP_THRESHOLD_PX = 60;



export function recalculatePlacement(card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const distFromViewportRight = window.innerWidth - rect.right;
    const placement = distFromViewportRight < FLIP_THRESHOLD_PX ? 'left' : 'right';
    card.setAttribute('data-bar-placement', placement);
}

/**
 * Proximity detection: measures how close the cursor is to the bar-side edge.
 * Sets data-bar-proximity and elevates the ReactFlow node wrapper z-index.
 */
export function checkProximity(card: HTMLElement, clientX: number): void {
    const rect = card.getBoundingClientRect();
    const placement = card.getAttribute('data-bar-placement') ?? 'right';

    const edgeX = placement === 'left' ? rect.left : rect.right;
    const signedDist = placement === 'left'
        ? edgeX - clientX
        : clientX - edgeX;

    const distToEdge = Math.abs(signedDist);

    if (distToEdge <= PROXIMITY_THRESHOLD_PX) {
        card.setAttribute('data-bar-proximity', 'near');
    } else {
        card.removeAttribute('data-bar-proximity');
    }
}
