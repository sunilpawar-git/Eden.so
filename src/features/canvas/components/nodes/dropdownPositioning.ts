/**
 * Shared dropdown positioning logic for bar menus (ColorMenu, TransformMenu, ShareMenu).
 * Opens dropdown to the side of the trigger button, respecting bar placement direction.
 */

/** Reads --dropdown-side-offset from :root; falls back to 8px. */
function getSideOffset(): number {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--dropdown-side-offset').trim();
    return parseFloat(raw) || 8;
}

/** Calculate dropdown position based on bar placement direction. */
export function getDropdownPosition(
    buttonEl: HTMLElement,
): { top: number; left: number } {
    const rect = buttonEl.getBoundingClientRect();
    const offset = getSideOffset();
    const placement = buttonEl.closest('[data-bar-placement]')
        ?.getAttribute('data-bar-placement') ?? 'right';
    const left = placement === 'left'
        ? rect.left - offset
        : rect.right + offset;
    return { top: rect.top, left };
}
